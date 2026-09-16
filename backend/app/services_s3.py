"""S3 utilities — all functions fail gracefully if boto3 / credentials are missing."""
import uuid

try:
    import boto3
    from botocore.exceptions import ClientError
    _available = True
except ImportError:
    _available = False

BUCKET = "scoringbasket"
REGION = "ap-south-2"
PREFIX = "telemedicine"

_client = None


def _s3():
    global _client
    if _client is None and _available:
        _client = boto3.client("s3", region_name=REGION)
    return _client


def upload_file_to_s3(file_obj, content_type: str, folder: str, prefix: str) -> str | None:
    """Upload a file-like object. Returns the S3 key or None on failure."""
    s3 = _s3()
    if s3 is None:
        return None
    ext = (content_type.split("/")[-1]).split(";")[0]
    key = f"{PREFIX}/{folder}/{prefix}_{uuid.uuid4().hex[:8]}.{ext}"
    try:
        s3.upload_fileobj(file_obj, BUCKET, key, ExtraArgs={"ContentType": content_type})
        return key
    except Exception:
        return None


def get_presigned_url(s3_key: str, expires: int = 3600) -> str | None:
    """Return a pre-signed GET URL valid for `expires` seconds, or None."""
    s3 = _s3()
    if s3 is None or not s3_key:
        return None
    try:
        return s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": BUCKET, "Key": s3_key},
            ExpiresIn=expires,
        )
    except Exception:
        return None


def delete_from_s3(s3_key: str) -> None:
    s3 = _s3()
    if s3 is None or not s3_key:
        return
    try:
        s3.delete_object(Bucket=BUCKET, Key=s3_key)
    except Exception:
        pass
