import json
import base64
import boto3
from datetime import datetime, timezone
from botocore.exceptions import ClientError

dynamodb = boto3.resource("dynamodb")
sqs = boto3.client("sqs")

SCHEDULE_TABLE = "schedule"
STUDENTS_TABLE = "student"
COACHES_TABLE = "coaches"
SQS_QUEUE_URL = "https://sqs.sa-east-1.amazonaws.com/138413505977/MailSender"

CANCELLABLE_STATUSES = ("AVAILABLE", "REQUESTED", "BOOKED")


# ── Helpers ────────────────────────────────────────────────────────────────────

def get_coach_id_from_jwt(event: dict) -> str:
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


def fetch_students_by_ids(student_ids: list[str]) -> dict[str, dict]:
    if not student_ids:
        return {}
    try:
        batch_result = dynamodb.batch_get_item(
            RequestItems={
                STUDENTS_TABLE: {
                    "Keys": [{"studentId": sid} for sid in student_ids],
                    "ProjectionExpression": "studentId, email, #n",
                    "ExpressionAttributeNames": {"#n": "name"},
                }
            }
        )
        items = batch_result.get("Responses", {}).get(STUDENTS_TABLE, [])
        return {s["studentId"]: s for s in items}
    except ClientError as e:
        print(f"[WARN] Could not fetch students: {e.response['Error']['Message']}")
        return {}


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

    # ── 2. Extract coachId from JWT ────────────────────────────────────────────
    try:
        coach_id_jwt = get_coach_id_from_jwt(event)
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

    # ── 3. Validate ownership ──────────────────────────────────────────────────
    if schedule.get("coachId") != coach_id_jwt:
        return _response(403, {"errors": ["You are not authorized to cancel this schedule."]})

    # ── 3. Validate current status ─────────────────────────────────────────────
    current_status = schedule.get("status")
    if current_status not in CANCELLABLE_STATUSES:
        return _response(422, {"errors": [
            f"Schedule cannot be cancelled. Current status is '{current_status}'."
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

    # ── 5. Fetch coach name for email body ─────────────────────────────────────
    try:
        coach_result = dynamodb.Table(COACHES_TABLE).get_item(Key={"coachId": coach_id_jwt})
        coach_name = coach_result.get("Item", {}).get("name", coach_id_jwt)
    except ClientError as e:
        print(f"[WARN] Could not fetch coach name: {e.response['Error']['Message']}")
        coach_name = coach_id_jwt

    date_str, time_str = format_schedule_datetime(schedule["startDateTime"])

    # ── 6. Determine who to notify ─────────────────────────────────────────────
    students_to_notify: list[str] = []  # list of studentIds

    if current_status == "BOOKED":
        # Notify only the booked student
        booked_student = schedule.get("studentId")
        if booked_student:
            students_to_notify.append(booked_student)
    else:
        # AVAILABLE or REQUESTED — notify all students with status REQUESTED in requests[]
        requests = schedule.get("requests") or []
        students_to_notify = [
            r["studentId"] for r in requests if r.get("status") == "REQUESTED"
        ]

    # ── 7. Fetch emails and send notifications ─────────────────────────────────
    if students_to_notify:
        students_by_id = fetch_students_by_ids(students_to_notify)

        for student_id in students_to_notify:
            student = students_by_id.get(student_id, {})
            email = student.get("email")
            if not email:
                print(f"[WARN] No email found for student '{student_id}', skipping notification.")
                continue

            send_sqs(
                email=email,
                subject="Aula cancelada pelo Coach",
                body=(
                    f"Infelizmente a aula com o coach {coach_name} "
                    f"para o dia {date_str} às {time_str} horas foi cancelada. "
                    f"Não fique sem treinar. Acesse agora CoachMatch.com.br e busque um novo horário."
                ),
            )

    return _response(200, {
        "message": "Schedule cancelled successfully.",
        "scheduleId": schedule_id,
        "status": "CANCELLED",
        "notifiedStudents": len(students_to_notify),
        "cancelledAt": now,
    })


def _response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, ensure_ascii=False, default=str),
    }
