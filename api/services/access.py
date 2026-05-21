from __future__ import annotations

from fastapi import HTTPException, status

from models.event import Event
from models.user import User, UserRole


class AccessService:
    def can_view_all_events(self, user: User) -> bool:
        return user.role in {UserRole.MANAGER, UserRole.ADMIN}

    def can_access_event(self, user: User, event: Event) -> bool:
        return event.owner_id == user.id or self.can_view_all_events(user)

    def can_edit_event(self, user: User, event: Event) -> bool:
        return event.owner_id == user.id or user.role in {UserRole.MANAGER, UserRole.ADMIN}

    def can_delete_event(self, user: User, event: Event) -> bool:
        return event.owner_id == user.id or user.role == UserRole.ADMIN

    def can_manage_roles(self, user: User) -> bool:
        return user.role == UserRole.ADMIN

    def ensure_event_view_access(self, user: User, event: Event) -> None:
        if not self.can_access_event(user, event):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав для просмотра события")

    def ensure_event_edit_access(self, user: User, event: Event) -> None:
        if not self.can_edit_event(user, event):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав для изменения события")

    def ensure_event_delete_access(self, user: User, event: Event) -> None:
        if not self.can_delete_event(user, event):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав для удаления события")

    def ensure_role_management_access(self, user: User) -> None:
        if not self.can_manage_roles(user):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Только администратор может управлять ролями")
