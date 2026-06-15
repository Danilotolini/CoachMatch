import json
import base64
import boto3
from botocore.exceptions import ClientError

dynamodb = boto3.resource("dynamodb")

SCHEDULE_TABLE = "schedule"
STUDENTS_TABLE = "student"


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

    # ── 3. Validate coachId ownership ─────────────────────────────────────────
    if schedule.get("coachId") != coach_id_jwt:
        return _response(403, {"errors": ["You are not authorized to view requests for this schedule."]})

    requests = schedule.get("requests") or []

    if not requests:
        return _response(200, {
            "scheduleId": schedule_id,
            "count": 0,
            "requests": [],
        })

    # ── 4. Enrich requests with student name ───────────────────────────────────
    student_ids = list({r["studentId"] for r in requests})

    try:
        batch_result = dynamodb.batch_get_item(
            RequestItems={
                STUDENTS_TABLE: {
                    "Keys": [{"studentId": sid} for sid in student_ids],
                    "ProjectionExpression": "studentId, profile",
                }
            }
        )
        students_items = batch_result.get("Responses", {}).get(STUDENTS_TABLE, [])
        students_by_id = {s["studentId"]: s for s in students_items}
    except ClientError as e:
        print(f"[WARN] Could not fetch student data: {e.response['Error']['Message']}")
        students_by_id = {}

    enriched_requests = [
        {
            **r,
            "studentName": students_by_id.get(r["studentId"], {}).get("profile", {}).get("name"),
        }
        for r in requests
    ]

    return _response(200, {
        "scheduleId": schedule_id,
        "startDateTime": schedule.get("startDateTime"),
        "endDateTime": schedule.get("endDateTime"),
        "status": schedule.get("status"),
        "count": len(enriched_requests),
        "requests": enriched_requests,
    })


def _response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, ensure_ascii=False, default=str),
    }
