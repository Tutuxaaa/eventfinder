from __future__ import annotations

from fastapi import HTTPException, status

from models.user import User
from repositories.events import EventRepository
from schemas import EventCreate, EventListResponse, EventQueryParams, EventUpdate
from services.access import AccessService


class EventService:
    def __init__(self, events: EventRepository, access: AccessService):
        self.events = events
        self.access = access

    def create_event(self, payload: EventCreate, current_user: User):
        return self.events.create(payload, owner_id=current_user.id)

    def list_events(self, params: EventQueryParams, current_user: User) -> EventListResponse:
        can_view_all = self.access.can_view_all_events(current_user)
        if params.scope == "all" and not can_view_all:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав для просмотра полного каталога")
        items, total = self.events.list_filtered(params, viewer_id=current_user.id, can_view_all=can_view_all)
        return EventListResponse.build(items=items, total=total, page=params.page, page_size=params.page_size)

    def get_event(self, event_id: int, current_user: User):
        event = self.events.get_by_id(event_id)
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Событие не найдено")
        self.access.ensure_event_view_access(current_user, event)
        return event

    def update_event(self, event_id: int, payload: EventUpdate, current_user: User):
        event = self.events.get_by_id(event_id)
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Событие не найдено")
        self.access.ensure_event_edit_access(current_user, event)
        return self.events.update(event, payload)

    def delete_event(self, event_id: int, current_user: User) -> None:
        event = self.events.get_by_id(event_id)
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Событие не найдено")
        self.access.ensure_event_delete_access(current_user, event)
        self.events.delete(event)
