import json
import boto3
from datetime import datetime
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

dynamodb = boto3.resource("dynamodb")

SCHEDULE_TABLE = "schedule"


def lambda_handler(event, context):
    # ── 1. Parse body ──────────────────────────────────────────────────────────
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return _response(400, {"errors": ["Invalid JSON body."]})

    required_fields = ["coachId", "startDateTime", "endDateTime"]
    missing = [f for f in required_fields if f not in body]
    if missing:
        return _response(400, {"errors": [f"Missing required fields: {', '.join(missing)}"]})

    coach_id = body["coachId"]
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

    # ── 2. Query Coach_Date GSI with startDateTime range ───────────────────────
    try:
        table = dynamodb.Table(SCHEDULE_TABLE)
        response = table.query(
            IndexName="Coach_Date",
            KeyConditionExpression=(
                Key("coachId").eq(coach_id)
                & Key("startDateTime").between(start_dt, end_dt)
            ),
            FilterExpression="#st IN (:available, :requested)",
            ExpressionAttributeNames={"#st": "status"},
            ExpressionAttributeValues={
                ":available": "AVAILABLE",
                ":requested": "REQUESTED",
            },
        )
    except ClientError as e:
        return _response(500, {"errors": [f"Failed to query schedules: {e.response['Error']['Message']}"]})

    # Return only relevant fields to the student
    allowed_fields = {"scheduleId", "coachId", "gymId", "price", "specialtyId", "startDateTime", "endDateTime", "status"}
    items = [
        {k: v for k, v in item.items() if k in allowed_fields}
        for item in response.get("Items", [])
    ]

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
