from __future__ import annotations

from fastapi import HTTPException, status

from auth import create_access_token, create_refresh_token, decode_token, hash_password, verify_password
from models.user import User, UserRole
from repositories.tokens import RefreshTokenRepository
from repositories.users import UserRepository
from schemas import TokenPair, UserCreate
from settings import get_settings


class AuthService:
    def __init__(self, users: UserRepository, refresh_tokens: RefreshTokenRepository):
        self.users = users
        self.refresh_tokens = refresh_tokens

    def register(self, payload: UserCreate) -> User:
        if self.users.get_by_email(payload.email):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email уже зарегистрирован")
        return self.users.create(
            email=payload.email,
            name=payload.name,
            hashed_password=hash_password(payload.password),
            role=UserRole.USER,
        )

    def login(self, username: str, password: str) -> TokenPair:
        user = self.users.get_by_email(username)
        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверные учётные данные")
        return self._issue_token_pair(user)

    def refresh(self, refresh_token: str) -> TokenPair:
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Невалидный refresh token")

        jti = payload.get("jti")
        sub = payload.get("sub")
        if not jti or not sub:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Невалидный refresh token payload")

        stored = self.refresh_tokens.get_by_jti(jti)
        if not stored or stored.revoked:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token отозван")
        user = self.users.get_by_id(int(sub))
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Пользователь не найден")

        self.refresh_tokens.revoke(stored)
        return self._issue_token_pair(user)

    def logout(self, refresh_token: str) -> None:
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            return
        jti = payload.get("jti")
        if not jti:
            return
        stored = self.refresh_tokens.get_by_jti(jti)
        if stored and not stored.revoked:
            self.refresh_tokens.revoke(stored)

    def get_current_user(self, token: str) -> User:
        payload = decode_token(token)
        if not payload or payload.get("type") != "access":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Невалидный access token")
        sub = payload.get("sub")
        if not sub:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Токен не содержит пользователя")
        user = self.users.get_by_id(int(sub))
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Пользователь не найден")
        return user

    def _issue_token_pair(self, user: User) -> TokenPair:
        settings = get_settings()
        access_token = create_access_token(user.id, user.email, user.role)
        refresh_token, jti, expires_at = create_refresh_token(user.id, user.email, user.role)
        self.refresh_tokens.create(user_id=user.id, jti=jti, expires_at=expires_at)
        return TokenPair(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.access_token_expire_minutes * 60,
        )
