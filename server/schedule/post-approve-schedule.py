import json
import base64
import boto3
from datetime import datetime, timezone
from botocore.exceptions import ClientError

dynamodb = boto3.resource("dynamodb")
sqs = boto3.client("sqs")

SCHEDULE_TABLE = "schedule"
COACHES_TABLE = "coaches"
STUDENTS_TABLE = "student"
SQS_QUEUE_URL = "https://sqs.sa-east-1.amazonaws.com/138413505977/MailSender"


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


# ── Handler ────────────────────────────────────────────────────────────────────

def lambda_handler(event, context):
    # ── 1. Parse body ──────────────────────────────────────────────────────────
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return _response(400, {"errors": ["Invalid JSON body."]})

    required_fields = ["scheduleId", "studentId"]
    missing = [f for f in required_fields if f not in body]
    if missing:
        return _response(400, {"errors": [f"Missing required fields: {', '.join(missing)}"]})

    schedule_id = body["scheduleId"]
    approved_student_id = body["studentId"]

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

    # ── 3. Validate coachId ownership ─────────────────────────────────────────
    if schedule.get("coachId") != coach_id_jwt:
        return _response(403, {"errors": ["You are not authorized to approve this schedule."]})

    # ── 4. Validate studentId is in requests ───────────────────────────────────
    requests = schedule.get("requests")
    if not requests:
        return _response(422, {"errors": ["This schedule has no pending requests."]})

    student_ids_in_requests = {r["studentId"] for r in requests}
    if approved_student_id not in student_ids_in_requests:
        return _response(422, {"errors": [f"Student '{approved_student_id}' has no request for this schedule."]})

    # ── 5. Build updated requests array ───────────────────────────────────────
    now = datetime.now(timezone.utc).isoformat()

    updated_requests = [
        {
            **r,
            "status": "APPROVED" if r["studentId"] == approved_student_id else "REJECTED",
            "alteredAt": now,
        }
        for r in requests
    ]

    # ── 5. Update schedule ─────────────────────────────────────────────────────
    try:
        dynamodb.Table(SCHEDULE_TABLE).update_item(
            Key={"scheduleId": schedule_id},
            UpdateExpression=(
                "SET studentId = :studentId, "
                "#st = :status, "
                "#req = :requests, "
                "updatedAt = :updatedAt"
            ),
            ExpressionAttributeNames={
                "#st": "status",
                "#req": "requests",
            },
            ExpressionAttributeValues={
                ":studentId": approved_student_id,
                ":status": "BOOKED",
                ":requests": updated_requests,
                ":updatedAt": now,
            },
            ConditionExpression="attribute_exists(scheduleId)",
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return _response(404, {"errors": [f"Schedule '{schedule_id}' not found."]})
        return _response(500, {"errors": [f"Error updating schedule: {e.response['Error']['Message']}"]})

    # ── 6. Fetch coach name for email body ─────────────────────────────────────
    try:
        coach_result = dynamodb.Table(COACHES_TABLE).get_item(Key={"coachId": coach_id_jwt})
        coach = coach_result.get("Item", {})
        coach_name = coach.get("name", coach_id_jwt)
    except ClientError as e:
        print(f"[WARN] Could not fetch coach name: {e.response['Error']['Message']}")
        coach_name = coach_id_jwt

    date_str, time_str = format_schedule_datetime(schedule["startDateTime"])

    # ── 6. Fetch student emails in batch ───────────────────────────────────────
    student_ids = list(student_ids_in_requests)

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
        students_items = batch_result.get("Responses", {}).get(STUDENTS_TABLE, [])
        students_by_id = {s["studentId"]: s for s in students_items}
    except ClientError as e:
        print(f"[WARN] Could not fetch student emails: {e.response['Error']['Message']}")
        students_by_id = {}

    # ── 7 & 8. Send SQS notifications ─────────────────────────────────────────
    for req in updated_requests:
        sid = req["studentId"]
        student = students_by_id.get(sid, {})
        email = student.get("email")

        if not email:
            print(f"[WARN] No email found for student '{sid}', skipping notification.")
            continue

        if req["status"] == "APPROVED":
            send_sqs(
                email=email,
                subject="Sua aula esta agendada",
                body=(
                    f"Sua aula com o coach {coach_name} para o dia {date_str} "
                    f"às {time_str} horas está agendada."
                ),
            )
        else:  # REJECTED
            send_sqs(
                email=email,
                subject="Sua requisição de aula foi rejeitada",
                body=(
                    f"Sua aula com o coach {coach_name} para o dia {date_str} "
                    f"às {time_str} horas foi rejeitada. "
                    f"Não fique sem treinar. Acesse agora CoachMatch.com.br e busque um novo Coach."
                ),
            )

    return _response(200, {
        "message": "Schedule approved successfully.",
        "scheduleId": schedule_id,
        "studentId": approved_student_id,
        "status": "BOOKED",
        "updatedAt": now,
    })


def _response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, ensure_ascii=False, default=str),
    }
