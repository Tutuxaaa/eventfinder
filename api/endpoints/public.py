from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from dependencies import get_event_repository
from repositories.events import EventRepository
from schemas import PublicEventListResponse, PublicEventQueryParams, PublicEventRead

router = APIRouter()


@router.get("/public/events", response_model=PublicEventListResponse)
def list_public_events(
    q: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    location: Optional[str] = Query(default=None),
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    upcoming_only: bool = True,
    sort_by: str = Query(default="date", pattern="^(date|created_at|title)$"),
    sort_order: str = Query(default="asc", pattern="^(asc|desc)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=50),
    events: EventRepository = Depends(get_event_repository),
):
    params = PublicEventQueryParams(
        q=q,
        category=category,
        location=location,
        date_from=date_from,
        date_to=date_to,
        upcoming_only=upcoming_only,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )
    items, total = events.list_public(params)
    payload = [PublicEventRead.model_validate(item) for item in items]
    return PublicEventListResponse.build(items=payload, total=total, page=params.page, page_size=params.page_size)


@router.get("/public/events/{event_id}", response_model=PublicEventRead)
def get_public_event(event_id: int, events: EventRepository = Depends(get_event_repository)):
    event = events.get_by_id(event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Событие не найдено")
    return PublicEventRead.model_validate(event)
