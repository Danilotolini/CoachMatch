import json
import base64
import boto3
from boto3.dynamodb.conditions import Key, Attr
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
    # ── 1. Extract studentId from JWT ──────────────────────────────────────────
    try:
        student_id = get_student_id_from_jwt(event)
    except ValueError as e:
        return _response(401, {"errors": [str(e)]})

    # ── 2. Query Student_Date GSI ──────────────────────────────────────────────
    # The Student_Date GSI uses studentId (PK) + startDateTime (SK).
    # Note: studentId on the schedule is only set after BOOKED.
    # Requests are stored inside the requests[] array — so we scan for schedules
    # where the requests array contains an entry for this student.
    #
    # Since there is no GSI that indexes the requests array, we use the
    # Student_Date GSI (which reflects the booked studentId) for BOOKED schedules,
    # and fall back to a FilterExpression scan on the requests array for
    # AVAILABLE / REQUESTED schedules where the student has a pending request.
    #
    # Best approach: query Student_Date GSI (covers BOOKED) + scan with filter
    # for non-booked requests, then merge and deduplicate.

    table = dynamodb.Table(SCHEDULE_TABLE)
    results = {}

    # ── 2a. Query Student_Date GSI — covers schedules where student is BOOKED ──
    try:
        booked_response = table.query(
            IndexName="Student_Date",
            KeyConditionExpression=Key("studentId").eq(student_id),
        )
        for item in booked_response.get("Items", []):
            results[item["scheduleId"]] = item
    except ClientError as e:
        return _response(500, {"errors": [f"Error querying schedules: {e.response['Error']['Message']}"]})

    # ── 2b. Scan for schedules where student appears in requests[] array ────────
    # This covers REQUESTED / CANCELLED requests not yet booked.
    try:
        scan_response = table.scan(
            FilterExpression=Attr("requests").exists(),
        )
        for item in scan_response.get("Items", []):
            if item["scheduleId"] in results:
                continue  # already captured via GSI
            requests = item.get("requests") or []
            student_in_requests = any(r["studentId"] == student_id for r in requests)
            if student_in_requests:
                results[item["scheduleId"]] = item
    except ClientError as e:
        return _response(500, {"errors": [f"Error scanning schedules: {e.response['Error']['Message']}"]})

    # ── 3. Build response — include only the student's own request entry ────────
    output = []
    for item in results.values():
        requests = item.get("requests") or []
        student_request = next((r for r in requests if r["studentId"] == student_id), None)

        output.append({
            "scheduleId": item.get("scheduleId"),
            "coachId": item.get("coachId"),
            "gymId": item.get("gymId"),
            "specialtyId": item.get("specialtyId"),
            "price": item.get("price"),
            "startDateTime": item.get("startDateTime"),
            "endDateTime": item.get("endDateTime"),
            "scheduleStatus": item.get("status"),
            "request": student_request,
        })

    # Sort by startDateTime ascending
    output.sort(key=lambda x: x.get("startDateTime") or "")

    return _response(200, {
        "studentId": student_id,
        "count": len(output),
        "schedules": output,
    })


def _response(status_code: int, body: dict) -> dict:
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body, ensure_ascii=False, default=str),
    }
