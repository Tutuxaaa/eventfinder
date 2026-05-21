from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from models.refresh_token import RefreshToken


class RefreshTokenRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, *, user_id: int, jti: str, expires_at: datetime) -> RefreshToken:
        token = RefreshToken(user_id=user_id, jti=jti, expires_at=expires_at)
        self.db.add(token)
        self.db.commit()
        self.db.refresh(token)
        return token

    def get_by_jti(self, jti: str) -> RefreshToken | None:
        return self.db.query(RefreshToken).filter(RefreshToken.jti == jti).first()

    def revoke(self, token: RefreshToken) -> RefreshToken:
        token.revoked = True
        token.revoked_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(token)
        return token

    def revoke_for_user(self, user_id: int) -> None:
        self.db.query(RefreshToken).filter(RefreshToken.user_id == user_id, RefreshToken.revoked.is_(False)).update(
            {RefreshToken.revoked: True}, synchronize_session=False
        )
        self.db.commit()
