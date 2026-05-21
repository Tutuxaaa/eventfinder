from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from jose import JWTError, jwt
from passlib.context import CryptContext

from settings import get_settings

settings = get_settings()

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


class TokenKind:
    ACCESS = "access"
    REFRESH = "refresh"
    FILE_ACCESS = "file_access"


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def hash_password(password: str) -> str:
    if not password:
        raise ValueError("Password is required")
    if len(password) > 1024:
        raise ValueError("Password too long")
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def _encode_token(payload: dict[str, Any], expires_delta: timedelta) -> str:
    issued_at = utcnow()
    to_encode = payload.copy()
    to_encode.update({"iat": issued_at, "jti": uuid4().hex, "exp": issued_at + expires_delta})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def create_access_token(user_id: int, email: str, role: str) -> str:
    return _encode_token(
        {
            "sub": str(user_id),
            "email": email,
            "role": role,
            "type": TokenKind.ACCESS,
        },
        timedelta(minutes=settings.access_token_expire_minutes),
    )


def create_refresh_token(user_id: int, email: str, role: str) -> tuple[str, str, datetime]:
    jti = uuid4().hex
    expires_at = utcnow() + timedelta(days=settings.refresh_token_expire_days)
    token = jwt.encode(
        {
            "sub": str(user_id),
            "email": email,
            "role": role,
            "type": TokenKind.REFRESH,
            "jti": jti,
            "iat": utcnow(),
            "exp": expires_at,
        },
        settings.secret_key,
        algorithm=settings.algorithm,
    )
    return token, jti, expires_at


def create_file_access_token(file_id: int) -> str:
    return _encode_token(
        {"file_id": file_id, "type": TokenKind.FILE_ACCESS},
        timedelta(minutes=settings.file_access_expire_minutes),
    )


def decode_token(token: str) -> dict[str, Any] | None:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        return None
