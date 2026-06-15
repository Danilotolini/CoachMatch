import json
import base64
import boto3
from datetime import datetime
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

dynamodb = boto3.resource("dynamodb")

SCHEDULE_TABLE = "schedule"


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


def lambda_handler(event, context):
    # ── 1. Parse params ────────────────────────────────────────────────────────
    # Em GET, o navegador envia os dados pela query string. Mantemos o body JSON
    # como fallback para clientes que suportam isso, como o Postman.
    body = event.get("queryStringParameters") or {}
    if not body:
        try:
            body = json.loads(event.get("body") or "{}")
        except json.JSONDecodeError:
            return _response(400, {"errors": ["Invalid JSON body."]})

    required_fields = ["startDateTime", "endDateTime"]
    missing = [f for f in required_fields if f not in body]
    if missing:
        return _response(400, {"errors": [f"Missing required fields: {', '.join(missing)}"]})

    start_dt = body["startDateTime"]
    end_dt = body["endDateTime"]

    # Validate datetime formats
    errors = []
    try:
        datetime.fromisoformat(start_dt)
    except ValueError:
        errors.append("Invalid startDateTime format. Use ISO 8601 (e.g. 2026-05-25T07:00:00-03:00).")

    try:
        datetime.fromisoformat(end_dt)
    except ValueError:
        errors.append("Invalid endDateTime format. Use ISO 8601 (e.g. 2026-05-25T08:00:00-03:00).")

    if not errors and datetime.fromisoformat(start_dt) >= datetime.fromisoformat(end_dt):
        errors.append("startDateTime must be before endDateTime.")

    if errors:
        return _response(400, {"errors": errors})

    # ── 2. Extract coachId from JWT ────────────────────────────────────────────
    try:
        coach_id = get_coach_id_from_jwt(event)
    except ValueError as e:
        return _response(401, {"errors": [str(e)]})

    # ── 3. Query Coach_Date GSI with startDateTime range ───────────────────────
    try:
        table = dynamodb.Table(SCHEDULE_TABLE)
        response = table.query(
            IndexName="Coach_Date",
            KeyConditionExpression=(
                Key("coachId").eq(coach_id)
                & Key("startDateTime").between(start_dt, end_dt)
            ),
        )
    except ClientError as e:
        return _response(500, {"errors": [f"Failed to query schedules: {e.response['Error']['Message']}"]})

    items = response.get("Items", [])

    return _response(200, {
        "coachId": coach_id,
        "startDateTime": start_dt,
        "endDateTime": end_dt,
        "count": len(items),
        "schedules": items,
    })


def _response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, ensure_ascii=False, default=str),
    }
