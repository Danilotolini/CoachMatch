import json
import boto3
from datetime import datetime
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

dynamodb = boto3.resource("dynamodb")

SCHEDULE_TABLE = "schedule"

ALLOWED_FIELDS = {"scheduleId", "coachId", "gymId", "price", "specialtyId", "startDateTime", "endDateTime", "status"}


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

    required_fields = ["gymId", "startDateTime", "endDateTime"]
    missing = [f for f in required_fields if f not in body]
    if missing:
        return _response(400, {"errors": [f"Missing required fields: {', '.join(missing)}"]})

    gym_id = body["gymId"]
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

    # ── 2. Query Gym_Date GSI with startDateTime range ─────────────────────────
    # GSI Gym_Date: gymId (PK) + startDateTime, coachId (SK)
    # startDateTime is part of the SK — use begins_with or between on the full SK string.
    # Since the SK is a composite of startDateTime + coachId, we filter startDateTime via
    # FilterExpression after querying by gymId only, keeping the query efficient.
    try:
        table = dynamodb.Table(SCHEDULE_TABLE)
        response = table.query(
            IndexName="Gym_Date",
            KeyConditionExpression=(
                Key("gymId").eq(gym_id)
                & Key("startDateTime").between(start_dt, end_dt)
            ),
            FilterExpression=(
                "#st IN (:available, :requested)"
            ),
            ExpressionAttributeNames={"#st": "status"},
            ExpressionAttributeValues={
                ":available": "AVAILABLE",
                ":requested": "REQUESTED"
            },
        )
    except ClientError as e:
        return _response(500, {"errors": [f"Failed to query schedules: {e.response['Error']['Message']}"]})

    items = [
        {k: v for k, v in item.items() if k in ALLOWED_FIELDS}
        for item in response.get("Items", [])
    ]

    return _response(200, {
        "gymId": gym_id,
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
