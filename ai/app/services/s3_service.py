import boto3
import uuid
import io
from PIL import Image
from pathlib import Path
import os
from dotenv import load_dotenv

load_dotenv()

s3 = boto3.client(
    "s3",
    aws_access_key_id     = os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key = os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name           = os.getenv("AWS_REGION", "ap-northeast-2"),
)
BUCKET = os.getenv("S3_BUCKET_NAME")
CLOUDFRONT_DOMAIN = os.getenv("CLOUDFRONT_DOMAIN")  # ← 추가

def upload_image_to_s3(image: Image.Image, prefix: str = "scratches") -> str:
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=85)
    buffer.seek(0)

    key = f"{prefix}/{uuid.uuid4()}.jpg"
    s3.upload_fileobj(buffer, BUCKET, key, ExtraArgs={"ContentType": "image/jpeg"})
    url = f"{CLOUDFRONT_DOMAIN}/{key}"
    print(f"[S3] 업로드 성공: {url}")
    return url

def upload_file_to_s3(file_path: Path, prefix: str = "originals") -> str:
    key = f"{prefix}/{uuid.uuid4()}{file_path.suffix}"
    s3.upload_file(str(file_path), BUCKET, key, ExtraArgs={"ContentType": "image/jpeg"})
    url = f"{CLOUDFRONT_DOMAIN}/{key}"
    print(f"[S3] 업로드 성공: {url}")
    return url