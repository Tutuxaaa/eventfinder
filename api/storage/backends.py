from __future__ import annotations

import io
from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4

from settings import get_settings

try:
    import boto3
except Exception:  # pragma: no cover - optional dependency
    boto3 = None


settings = get_settings()


@dataclass
class StoredObject:
    key: str
    size_bytes: int
    content_type: str
    original_name: str


class LocalObjectStorage:
    def __init__(self, base_dir: str):
        self.base_path = Path(base_dir)
        self.base_path.mkdir(parents=True, exist_ok=True)

    def save_bytes(self, *, data: bytes, original_name: str, content_type: str, folder: str) -> StoredObject:
        suffix = Path(original_name).suffix or ""
        key = f"{folder}/{uuid4().hex}{suffix}"
        file_path = self.base_path / key
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_bytes(data)
        return StoredObject(key=key, size_bytes=len(data), content_type=content_type, original_name=original_name)

    def delete(self, key: str) -> None:
        file_path = self.base_path / key
        if file_path.exists():
            file_path.unlink()

    def read_bytes(self, key: str) -> bytes:
        return (self.base_path / key).read_bytes()


class S3ObjectStorage:
    def __init__(self):
        if boto3 is None:
            raise RuntimeError("boto3 is not installed")
        if not settings.s3_bucket_name:
            raise RuntimeError("S3 bucket name is not configured")
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint_url,
            region_name=settings.s3_region,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
        )
        self.bucket_name = settings.s3_bucket_name

    def save_bytes(self, *, data: bytes, original_name: str, content_type: str, folder: str) -> StoredObject:
        suffix = Path(original_name).suffix or ""
        key = f"{folder}/{uuid4().hex}{suffix}"
        self.client.upload_fileobj(
            io.BytesIO(data),
            self.bucket_name,
            key,
            ExtraArgs={"ContentType": content_type},
        )
        return StoredObject(key=key, size_bytes=len(data), content_type=content_type, original_name=original_name)

    def delete(self, key: str) -> None:
        self.client.delete_object(Bucket=self.bucket_name, Key=key)

    def generate_presigned_download_url(self, key: str, expires_in: int) -> str:
        return self.client.generate_presigned_url(
            ClientMethod="get_object",
            Params={"Bucket": self.bucket_name, "Key": key},
            ExpiresIn=expires_in,
        )



def get_storage_backend():
    provider = settings.object_storage_provider.lower()
    if provider == "s3":
        return S3ObjectStorage()
    return LocalObjectStorage(settings.local_storage_dir)
