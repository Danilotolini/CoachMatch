import json
import uuid
import boto3
import base64
from datetime import datetime, timezone
from boto3.dynamodb.conditions import Key, Attr
from botocore.exceptions import ClientError

dynamodb = boto3.resource("dynamodb")

SCHEDULE_TABLE = "schedule"
GYMS_TABLE = "gyms"
SPECIALTIES_TABLE = "specialties"



def get_coach_id_from_jwt(event: dict) -> str:
    """Extract coachId (sub) from the JWT in the Authorization header."""
    auth_header = (
        event.get("headers", {}).get("Authorization")
        or event.get("headers", {}).get("authorization")
        or ""
    )
    if not auth_header.startswith("Bearer "):
        raise ValueError("Missing or invalid Authorization header.")

    token = auth_header.split(" ", 1)[1]
    # JWT payload is the second segment
    payload_b64 = token.split(".")[1]
    # Add padding if needed
    padding = 4 - len(payload_b64) % 4
    if padding != 4:
        payload_b64 += "=" * padding
    payload = json.loads(base64.b64decode(payload_b64).decode("utf-8"))

    sub = payload.get("sub")
    if not sub:
        raise ValueError("JWT does not contain 'sub' claim.")
    return sub


def has_schedule_conflict(coach_id: str, start_dt: str, end_dt: str) -> bool:
    """
    Check if the coach already has a schedule that overlaps with [start_dt, end_dt).
    Uses the Coach_Date GSI to retrieve existing schedules for the coach
    and checks for time overlap.
    """
    table = dynamodb.Table(SCHEDULE_TABLE)

    # Query all schedules for this coach (could be paginated for large sets)
    response = table.query(
        IndexName="Coach_Date",
        KeyConditionExpression=Key("coachId").eq(coach_id),
        FilterExpression=Attr("status").ne("CANCELLED"),
    )

    new_start = datetime.fromisoformat(start_dt)
    new_end = datetime.fromisoformat(end_dt)

    for item in response.get("Items", []):
        existing_start = datetime.fromisoformat(item["startDateTime"])
        existing_end = datetime.fromisoformat(item["endDateTime"])
        # Overlap when new_start < existing_end AND new_end > existing_start
        if new_start < existing_end and new_end > existing_start:
            return True

    return False


def gym_exists(gym_id: str) -> bool:
    table = dynamodb.Table(GYMS_TABLE)
    response = table.get_item(Key={"gymId": gym_id})
    return "Item" in response


def specialty_exists(specialty_id: str) -> bool:
    table = dynamodb.Table(SPECIALTIES_TABLE)
    response = table.get_item(Key={"id": specialty_id})
    return "Item" in response


def generate_schedule_id() -> str:
    return f"avl_{uuid.uuid4().hex}"


def lambda_handler(event, context):
    # ── 1. Parse body ──────────────────────────────────────────────────────────
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return _response(400, {"errors": ["Invalid JSON body."]})

    required_fields = ["gymId", "price", "specialtyId", "startDateTime", "endDateTime"]
    missing = [f for f in required_fields if f not in body]
    if missing:
        return _response(400, {"errors": [f"Missing required fields: {', '.join(missing)}"]})

    gym_id = body["gymId"]
    price = body["price"]
    specialty_id = body["specialtyId"]
    start_dt = body["startDateTime"]
    end_dt = body["endDateTime"]

    # ── 2. Extract coachId from JWT ────────────────────────────────────────────
    try:
        coach_id = get_coach_id_from_jwt(event)
    except ValueError as e:
        return _response(401, {"errors": [str(e)]})

    # ── 3–5. Validations (collect all errors) ──────────────────────────────────
    errors = []

    # Validate datetime formats
    try:
        datetime.fromisoformat(start_dt)
    except ValueError:
        errors.append("Invalid startDateTime format. Use ISO 8601 (e.g. 2026-05-25T07:00:00-03:00).")

    try:
        datetime.fromisoformat(end_dt)
    except ValueError:
        errors.append("Invalid endDateTime format. Use ISO 8601 (e.g. 2026-05-25T08:00:00-03:00).")

    if not errors:
        if datetime.fromisoformat(start_dt) >= datetime.fromisoformat(end_dt):
            errors.append("startDateTime must be before endDateTime.")

    # Check schedule conflict
    if not errors:
        try:
            if has_schedule_conflict(coach_id, start_dt, end_dt):
                errors.append(
                    f"Coach '{coach_id}' already has a schedule conflicting with "
                    f"{start_dt} – {end_dt}."
                )
        except ClientError as e:
            errors.append(f"Error checking schedule conflicts: {e.response['Error']['Message']}")

    # Check gym exists
    try:
        if not gym_exists(gym_id):
            errors.append(f"Gym '{gym_id}' not found.")
    except ClientError as e:
        errors.append(f"Error checking gym: {e.response['Error']['Message']}")

    # Check specialty exists
    try:
        if not specialty_exists(specialty_id):
            errors.append(f"Specialty '{specialty_id}' not found.")
    except ClientError as e:
        errors.append(f"Error checking specialty: {e.response['Error']['Message']}")

    if errors:
        return _response(422, {"errors": errors})

    # ── 6. Insert schedule ─────────────────────────────────────────────────────
    now = datetime.now(timezone.utc).isoformat()
    schedule_id = generate_schedule_id()

    item = {
        "scheduleId": schedule_id,
        "coachId": coach_id,
        "gymId": gym_id,
        "price": price,
        "specialtyId": specialty_id,
        "startDateTime": start_dt,
        "endDateTime": end_dt,
        "status": "AVAILABLE",
        "studentId": None,
        "paymentStatus": None,
        "rating": None,
        "studentComment": None,
        "requests": None,
        "createdAt": now,
        "updatedAt": now,
    }

    # DynamoDB doesn't store None; remove null fields before putting, then restore for response
    item_for_db = {k: v for k, v in item.items() if v is not None}

    try:
        table = dynamodb.Table(SCHEDULE_TABLE)
        table.put_item(Item=item_for_db)
    except ClientError as e:
        return _response(500, {"errors": [f"Failed to create schedule: {e.response['Error']['Message']}"]})

    return _response(201, item)


def _response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, ensure_ascii=False, default=str),
    }
