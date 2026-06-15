import json
import base64
import boto3
from datetime import datetime, timezone
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

dynamodb = boto3.resource("dynamodb")
sqs = boto3.client("sqs")

SCHEDULE_TABLE = "schedule"
COACHES_TABLE = "coaches"
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
    """Returns (date_str, time_str) formatted for the notification email."""
    dt = datetime.fromisoformat(iso_str)
    return dt.strftime("%d/%m/%Y"), dt.strftime("%H:%M")


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
        student_id = get_student_id_from_jwt(event)
    except ValueError as e:
        return _response(401, {"errors": [str(e)]})

    # ── 3. Fetch schedule and validate status ──────────────────────────────────
    table = dynamodb.Table(SCHEDULE_TABLE)

    try:
        result = table.get_item(Key={"scheduleId": schedule_id})
    except ClientError as e:
        return _response(500, {"errors": [f"Error fetching schedule: {e.response['Error']['Message']}"]})

    schedule = result.get("Item")
    if not schedule:
        return _response(404, {"errors": [f"Schedule '{schedule_id}' not found."]})

    status = schedule.get("status")
    coach_id = schedule.get("coachId")

    if status not in ("AVAILABLE", "REQUESTED"):
        return _response(422, {"errors": [f"Schedule is not available for requests. Current status: '{status}'."]}
        )

    # ── 4. Update schedule ─────────────────────────────────────────────────────
    now = datetime.now(timezone.utc).isoformat()

    new_request = {
        "studentId": student_id,
        "status": "REQUESTED",
        "requestedAt": now,
    }

    existing_requests = schedule.get("requests")  # None or list

    if existing_requests is None:
        # 4.1 First request — initialize the array
        updated_requests = [new_request]
        requests_expression = "SET #req = :requests, #st = :status, updatedAt = :updatedAt"
        expression_values = {
            ":requests": updated_requests,
            ":status": "REQUESTED",
            ":updatedAt": now,
        }
    else:
        # 4.1 Append to existing array
        requests_expression = (
            "SET #st = :status, updatedAt = :updatedAt "
            "ADD #req :new_request"
        )
        # DynamoDB ADD on a List doesn't exist — use list_append via SET
        requests_expression = (
            "SET #req = list_append(#req, :new_request), "
            "#st = :status, "
            "updatedAt = :updatedAt"
        )
        expression_values = {
            ":new_request": [new_request],
            ":status": "REQUESTED",
            ":updatedAt": now,
        }

    try:
        table.update_item(
            Key={"scheduleId": schedule_id},
            UpdateExpression=requests_expression,
            ExpressionAttributeNames={
                "#req": "requests",
                "#st": "status",
            },
            ExpressionAttributeValues=expression_values,
            ConditionExpression="attribute_exists(scheduleId)",
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return _response(404, {"errors": [f"Schedule '{schedule_id}' not found."]})
        return _response(500, {"errors": [f"Error updating schedule: {e.response['Error']['Message']}"]})

    # ── 5. Fetch coach email ───────────────────────────────────────────────────
    try:
        coach_result = dynamodb.Table(COACHES_TABLE).get_item(Key={"coachId": coach_id})
    except ClientError as e:
        return _response(500, {"errors": [f"Error fetching coach: {e.response['Error']['Message']}"]})

    coach = coach_result.get("Item")
    if not coach:
        return _response(404, {"errors": [f"Coach '{coach_id}' not found."]})

    coach_email = coach.get("email")
    if not coach_email:
        return _response(500, {"errors": [f"Coach '{coach_id}' has no email registered."]})

    # ── 6. Send SQS notification ───────────────────────────────────────────────
    date_str, time_str = format_schedule_datetime(schedule["startDateTime"])

    sqs_message = {
        "email": coach_email,
        "subject": "Nova requisição de Aula recebida",
        "body": (
            f"O aluno {student_id} está interessado na aula do dia {date_str} "
            f"às {time_str} horas. Acesse o CoachMatch para aprovar a aula."
        ),
    }

    try:
        sqs.send_message(
            QueueUrl=SQS_QUEUE_URL,
            MessageBody=json.dumps(sqs_message, ensure_ascii=False),
        )
    except ClientError as e:
        # Schedule was already updated — log the SQS error but don't roll back
        print(f"[WARN] Failed to send SQS notification: {e.response['Error']['Message']}")

    return _response(200, {
        "message": "Schedule request submitted successfully.",
        "scheduleId": schedule_id,
        "studentId": student_id,
        "status": "REQUESTED",
        "requestedAt": now,
    })


def _response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, ensure_ascii=False, default=str),
    }
