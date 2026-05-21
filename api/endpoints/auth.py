from __future__ import annotations

from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm

from dependencies import get_auth_service, get_current_user_from_token
from schemas import LogoutRequest, TokenPair, TokenRefreshRequest, UserCreate, UserRead
from services.auth_service import AuthService

router = APIRouter()


@router.post("/auth/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(user: UserCreate, auth_service: AuthService = Depends(get_auth_service)):
    return auth_service.register(user)


@router.post("/auth/token", response_model=TokenPair)
def login_for_tokens(
    form_data: OAuth2PasswordRequestForm = Depends(),
    auth_service: AuthService = Depends(get_auth_service),
):
    return auth_service.login(form_data.username, form_data.password)


@router.post("/auth/refresh", response_model=TokenPair)
def refresh_access_token(payload: TokenRefreshRequest, auth_service: AuthService = Depends(get_auth_service)):
    return auth_service.refresh(payload.refresh_token)


@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(payload: LogoutRequest, auth_service: AuthService = Depends(get_auth_service)):
    auth_service.logout(payload.refresh_token)


@router.get("/auth/me", response_model=UserRead)
def read_current_user(current_user=Depends(get_current_user_from_token)):
    return current_user
