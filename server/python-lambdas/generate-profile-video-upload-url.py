import boto3, json, os, uuid
from botocore.config import Config

REGION = os.environ.get("AWS_REGION", "sa-east-1")

# Forca o endpoint regional (bucket.s3.<region>.amazonaws.com). Sem isso, o boto3
# pode gerar o endpoint global (bucket.s3.amazonaws.com), que para buckets fora de
# us-east-1 responde com redirect 301/307 — o navegador nao segue redirect num POST
# CORS e o upload falha.
s3 = boto3.client(
    "s3",
    region_name=REGION,
    endpoint_url=f"https://s3.{REGION}.amazonaws.com",
    config=Config(signature_version="s3v4", s3={"addressing_style": "virtual"}),
)

BUCKET = os.environ["BUCKET_NAME"]
EXPIRES = int(os.environ.get("EXPIRES_IN", 300))
MAX_BYTES = int(os.environ.get("MAX_BYTES", 50 * 1024 * 1024))  # 50 MB default

def lambda_handler(event, context):
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return _response(400, {"error": "Invalid JSON body"})

    filename = body.get("filename", f"{uuid.uuid4()}.bin")
    content_type = body.get("contentType", "application/octet-stream")
    key = f"uploads/{uuid.uuid4()}-{filename}"

    presigned = s3.generate_presigned_post(
        Bucket=BUCKET,
        Key=key,
        Fields={"Content-Type": content_type},
        Conditions=[
            {"Content-Type": content_type},
            ["content-length-range", 1, MAX_BYTES],
            ["starts-with", "$key", "uploads/"],
        ],
        ExpiresIn=EXPIRES,
    )

    return _response(200, {"upload": presigned, "key": key, "expiresIn": EXPIRES})

def _response(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }
