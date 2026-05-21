from __future__ import annotations

from fastapi import APIRouter, Depends

from dependencies import get_access_service, get_current_user_from_token, get_user_repository
from repositories.users import UserRepository
from schemas import DEFAULT_ROLE_MATRIX, RoleMatrixResponse, UserRead, UserRoleUpdate
from services.access import AccessService

router = APIRouter()


@router.get("/rbac/matrix", response_model=RoleMatrixResponse)
def get_role_matrix():
    return DEFAULT_ROLE_MATRIX


@router.get("/users", response_model=list[UserRead])
def list_users(
    current_user=Depends(get_current_user_from_token),
    access: AccessService = Depends(get_access_service),
    users: UserRepository = Depends(get_user_repository),
):
    access.ensure_role_management_access(current_user)
    return users.list_all()


@router.patch("/users/{user_id}/role", response_model=UserRead)
def update_user_role(
    user_id: int,
    payload: UserRoleUpdate,
    current_user=Depends(get_current_user_from_token),
    access: AccessService = Depends(get_access_service),
    users: UserRepository = Depends(get_user_repository),
):
    access.ensure_role_management_access(current_user)
    user = users.get_by_id(user_id)
    if not user:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Пользователь не найден")
    return users.update_role(user, payload.role)
