from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from database import get_db
from repositories.events import EventRepository
from repositories.files import EventFileRepository
from repositories.tokens import RefreshTokenRepository
from repositories.users import UserRepository
from services.access import AccessService
from services.auth_service import AuthService
from services.event_service import EventService
from services.external_insights_service import ExternalInsightsService
from services.file_service import FileService
from storage.backends import get_storage_backend

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")


def get_user_repository(db: Session = Depends(get_db)) -> UserRepository:
    return UserRepository(db)


def get_refresh_token_repository(db: Session = Depends(get_db)) -> RefreshTokenRepository:
    return RefreshTokenRepository(db)


def get_event_repository(db: Session = Depends(get_db)) -> EventRepository:
    return EventRepository(db)


def get_event_file_repository(db: Session = Depends(get_db)) -> EventFileRepository:
    return EventFileRepository(db)


def get_access_service() -> AccessService:
    return AccessService()


def get_auth_service(
    users: UserRepository = Depends(get_user_repository),
    refresh_tokens: RefreshTokenRepository = Depends(get_refresh_token_repository),
) -> AuthService:
    return AuthService(users=users, refresh_tokens=refresh_tokens)


def get_event_service(
    events: EventRepository = Depends(get_event_repository),
    access: AccessService = Depends(get_access_service),
) -> EventService:
    return EventService(events=events, access=access)


def get_file_service(
    event_files: EventFileRepository = Depends(get_event_file_repository),
    events: EventRepository = Depends(get_event_repository),
    access: AccessService = Depends(get_access_service),
):
    return FileService(event_files=event_files, events=events, access=access, storage_backend=get_storage_backend())


def get_external_insights_service() -> ExternalInsightsService:
    return ExternalInsightsService()


def get_current_user_from_token(
    token: str = Depends(oauth2_scheme),
    auth_service: AuthService = Depends(get_auth_service),
):
    return auth_service.get_current_user(token)


def require_roles(*allowed_roles: str):
    def dependency(current_user=Depends(get_current_user_from_token)):
        if current_user.role not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав")
        return current_user

    return dependency
