import json
import base64
import boto3
from datetime import datetime, timezone
from botocore.exceptions import ClientError

dynamodb = boto3.resource("dynamodb")

SCHEDULE_TABLE = "schedule"


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

    # ── 3. Fetch schedule ──────────────────────────────────────────────────────
    try:
        result = dynamodb.Table(SCHEDULE_TABLE).get_item(Key={"scheduleId": schedule_id})
    except ClientError as e:
        return _response(500, {"errors": [f"Error fetching schedule: {e.response['Error']['Message']}"]})

    schedule = result.get("Item")
    if not schedule:
        return _response(404, {"errors": [f"Schedule '{schedule_id}' not found."]})

    # ── 3. Validate schedule status ────────────────────────────────────────────
    status = schedule.get("status")
    if status not in ("AVAILABLE", "REQUESTED"):
        return _response(422, {"errors": [f"Cannot cancel request. Schedule status is '{status}'."]}
        )

    # ── 4. Find student request and validate ───────────────────────────────────
    requests = schedule.get("requests") or []

    student_request = next((r for r in requests if r["studentId"] == student_id), None)

    if not student_request:
        return _response(404, {"errors": [f"No request found for student '{student_id}' in this schedule."]})

    if student_request["status"] != "REQUESTED":
        return _response(422, {"errors": [
            f"Request cannot be cancelled. Current request status is '{student_request['status']}'."
        ]})

    # ── 4. Build updated requests array ───────────────────────────────────────
    now = datetime.now(timezone.utc).isoformat()

    updated_requests = [
        {
            **r,
            "status": "CANCELLED",
            "alteredAt": now,
        } if r["studentId"] == student_id else r
        for r in requests
    ]

    # Recalculate schedule status:
    # If there are still other REQUESTED entries, keep REQUESTED; otherwise revert to AVAILABLE.
    has_other_requests = any(
        r["studentId"] != student_id and r["status"] == "REQUESTED"
        for r in updated_requests
    )
    new_schedule_status = "REQUESTED" if has_other_requests else "AVAILABLE"

    # ── 4. Persist update ─────────────────────────────────────────────────────
    try:
        dynamodb.Table(SCHEDULE_TABLE).update_item(
            Key={"scheduleId": schedule_id},
            UpdateExpression=(
                "SET #req = :requests, "
                "#st = :status, "
                "updatedAt = :updatedAt"
            ),
            ExpressionAttributeNames={
                "#req": "requests",
                "#st": "status",
            },
            ExpressionAttributeValues={
                ":requests": updated_requests,
                ":status": new_schedule_status,
                ":updatedAt": now,
            },
            ConditionExpression="attribute_exists(scheduleId)",
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return _response(404, {"errors": [f"Schedule '{schedule_id}' not found."]})
        return _response(500, {"errors": [f"Error updating schedule: {e.response['Error']['Message']}"]})

    return _response(200, {
        "message": "Request cancelled successfully.",
        "scheduleId": schedule_id,
        "studentId": student_id,
        "scheduleStatus": new_schedule_status,
        "cancelledAt": now,
    })


def _response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, ensure_ascii=False, default=str),
    }
