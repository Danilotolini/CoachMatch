import json
import base64
import boto3
from datetime import datetime, timezone, timedelta
from botocore.exceptions import ClientError

dynamodb = boto3.resource("dynamodb")
sqs = boto3.client("sqs")

SCHEDULE_TABLE = "schedule"
COACHES_TABLE = "coaches"
STUDENTS_TABLE = "student"
SQS_QUEUE_URL = "https://sqs.sa-east-1.amazonaws.com/138413505977/MailSender"


# ── Helpers ────────────────────────────────────────────────────────────────────

def get_student_id_from_jwt(event: dict) -> str:
    auth_header = (
        event.get("headers", {}).get("Authorization")
        or event.get("headers", {}).get("authorization")
        or ""
    )
    if not auth_header.startswith("Bearer "):
        raise ValueError("Missing or invalid Authorization header.")

    token = auth_header.split(" ", 1)[1]
    payload_b64 = token.split(".")[1]
    padding = 4 - len(payload_b64) % 4
    if padding != 4:
        payload_b64 += "=" * padding
    payload = json.loads(base64.b64decode(payload_b64).decode("utf-8"))

    sub = payload.get("sub")
    if not sub:
        raise ValueError("JWT does not contain 'sub' claim.")
    return sub


def format_schedule_datetime(iso_str: str) -> tuple[str, str]:
    dt = datetime.fromisoformat(iso_str)
    return dt.strftime("%d/%m/%Y"), dt.strftime("%H:%M")


def send_sqs(email: str, subject: str, body: str) -> None:
    message = {"email": email, "subject": subject, "body": body}
    try:
        sqs.send_message(
            QueueUrl=SQS_QUEUE_URL,
            MessageBody=json.dumps(message, ensure_ascii=False),
        )
    except ClientError as e:
        print(f"[WARN] Failed to send SQS to {email}: {e.response['Error']['Message']}")


# ── Handler ────────────────────────────────────────────────────────────────────

def lambda_handler(event, context):
    # ── 1. Parse body ──────────────────────────────────────────────────────────
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return _response(400, {"errors": ["Invalid JSON body."]})

    schedule_id = body.get("scheduleId")
    if not schedule_id:
        return _response(400, {"errors": ["Missing required field: scheduleId."]})

    # ── 2. Extract studentId from JWT ──────────────────────────────────────────
    try:
        student_id_jwt = get_student_id_from_jwt(event)
    except ValueError as e:
        return _response(401, {"errors": [str(e)]})

    # ── 3. Fetch schedule ──────────────────────────────────────────────────────
    try:
        result = dynamodb.Table(SCHEDULE_TABLE).get_item(Key={"scheduleId": schedule_id})
    except ClientError as e:
        return _response(500, {"errors": [f"Error fetching schedule: {e.response['Error']['Message']}"]})

    schedule = result.get("Item")
    if not schedule:
        return _response(404, {"errors": [f"Schedule '{schedule_id}' not found."]})

    # ── 3. Validate status is BOOKED ──────────────────────────────────────────
    if schedule.get("status") != "BOOKED":
        return _response(422, {"errors": [
            f"Schedule cannot be cancelled. Current status is '{schedule.get('status')}'. Expected 'BOOKED'."
        ]})

    # ── 3. Validate studentId ownership ───────────────────────────────────────
    if schedule.get("studentId") != student_id_jwt:
        return _response(403, {"errors": ["You are not authorized to cancel this schedule."]})

    # ── 3. Validate cancellation window — startDateTime must be > now + 6h ────
    start_dt = datetime.fromisoformat(schedule["startDateTime"])
    # Ensure timezone-aware comparison
    if start_dt.tzinfo is None:
        start_dt = start_dt.replace(tzinfo=timezone.utc)

    cancellation_deadline = datetime.now(timezone.utc) + timedelta(hours=6)

    if start_dt <= cancellation_deadline:
        return _response(422, {"errors": [
            "Cancellation is not allowed. The class starts in less than 6 hours."
        ]})

    # ── 4. Cancel schedule ─────────────────────────────────────────────────────
    now = datetime.now(timezone.utc).isoformat()

    try:
        dynamodb.Table(SCHEDULE_TABLE).update_item(
            Key={"scheduleId": schedule_id},
            UpdateExpression="SET #st = :status, updatedAt = :updatedAt",
            ExpressionAttributeNames={"#st": "status"},
            ExpressionAttributeValues={
                ":status": "CANCELLED",
                ":updatedAt": now,
            },
            ConditionExpression="attribute_exists(scheduleId)",
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return _response(404, {"errors": [f"Schedule '{schedule_id}' not found."]})
        return _response(500, {"errors": [f"Error cancelling schedule: {e.response['Error']['Message']}"]})

    # ── 5. Fetch coach email ───────────────────────────────────────────────────
    coach_id = schedule.get("coachId")
    coach_email = None
    coach_name = coach_id

    try:
        coach_result = dynamodb.Table(COACHES_TABLE).get_item(Key={"coachId": coach_id})
        coach = coach_result.get("Item", {})
        coach_email = coach.get("email")
        coach_name = coach.get("name", coach_id)
    except ClientError as e:
        print(f"[WARN] Could not fetch coach: {e.response['Error']['Message']}")

    # ── 5. Fetch student name for email body ───────────────────────────────────
    student_name = student_id_jwt
    try:
        student_result = dynamodb.Table(STUDENTS_TABLE).get_item(Key={"studentId": student_id_jwt})
        student_name = student_result.get("Item", {}).get("name", student_id_jwt)
    except ClientError as e:
        print(f"[WARN] Could not fetch student: {e.response['Error']['Message']}")

    # ── 6. Send SQS notification to coach ─────────────────────────────────────
    if coach_email:
        date_str, time_str = format_schedule_datetime(schedule["startDateTime"])
        send_sqs(
            email=coach_email,
            subject="Aula cancelada pelo aluno",
            body=(
                f"O aluno {student_name} cancelou a aula do dia {date_str} "
                f"às {time_str} horas. Acesse o CoachMatch para gerenciar sua agenda."
            ),
        )
    else:
        print(f"[WARN] No email found for coach '{coach_id}', skipping notification.")

    return _response(200, {
        "message": "Schedule cancelled successfully.",
        "scheduleId": schedule_id,
        "status": "CANCELLED",
        "cancelledAt": now,
    })


def _response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, ensure_ascii=False, default=str),
    }
