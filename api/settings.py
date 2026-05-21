from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path


class Settings:
    app_name: str = os.getenv("APP_NAME", "EventFinder API")
    app_version: str = os.getenv("APP_VERSION", "3.0.0")

    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./eventfinder_lab.db")
    secret_key: str = os.getenv("SECRET_KEY", "change-me-in-production")
    algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
    refresh_token_expire_days: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "14"))
    file_access_expire_minutes: int = int(os.getenv("FILE_ACCESS_EXPIRE_MINUTES", "10"))

    object_storage_provider: str = os.getenv("OBJECT_STORAGE_PROVIDER", "local")
    local_storage_dir: str = os.getenv("LOCAL_STORAGE_DIR", "./storage")
    public_api_base: str = os.getenv("PUBLIC_API_BASE", "http://localhost:8000")
    site_base_url: str = os.getenv("SITE_BASE_URL", "http://localhost:3000")

    s3_endpoint_url: str | None = os.getenv("S3_ENDPOINT_URL")
    s3_region: str = os.getenv("S3_REGION", "us-east-1")
    s3_access_key: str | None = os.getenv("S3_ACCESS_KEY")
    s3_secret_key: str | None = os.getenv("S3_SECRET_KEY")
    s3_bucket_name: str | None = os.getenv("S3_BUCKET_NAME")

    max_upload_size_bytes: int = int(os.getenv("MAX_UPLOAD_SIZE_BYTES", str(5 * 1024 * 1024)))
    allowed_upload_content_types: tuple[str, ...] = tuple(
        item.strip()
        for item in os.getenv(
            "ALLOWED_UPLOAD_CONTENT_TYPES",
            "image/jpeg,image/png,image/webp,application/pdf",
        ).split(",")
        if item.strip()
    )

    external_api_timeout_seconds: int = int(os.getenv("EXTERNAL_API_TIMEOUT_SECONDS", "8"))
    external_api_retries: int = int(os.getenv("EXTERNAL_API_RETRIES", "2"))
    external_api_requests_per_minute: int = int(os.getenv("EXTERNAL_API_REQUESTS_PER_MINUTE", "30"))
    external_api_user_agent: str = os.getenv("EXTERNAL_API_USER_AGENT", "EventFinder/3.0")
    open_meteo_geocoding_base_url: str = os.getenv("OPEN_METEO_GEOCODING_BASE_URL", "https://geocoding-api.open-meteo.com/v1")
    open_meteo_weather_base_url: str = os.getenv("OPEN_METEO_WEATHER_BASE_URL", "https://api.open-meteo.com/v1")

    def ensure_local_storage(self) -> Path:
        path = Path(self.local_storage_dir)
        path.mkdir(parents=True, exist_ok=True)
        return path


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    settings = Settings()
    settings.ensure_local_storage()
    return settings
