from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from fastapi.responses import Response

from dependencies import get_current_user_from_token, get_event_service, get_file_service
from schemas import (
    EventCreate,
    EventListResponse,
    EventQueryParams,
    EventRead,
    EventUpdate,
    FavoriteUpdate,
    FileAccessResponse,
    EventFileRead,
)
from services.event_service import EventService
from services.file_service import FileService

router = APIRouter()


@router.post("/events/", response_model=EventRead, status_code=status.HTTP_201_CREATED)
def create_event_endpoint(
    event: EventCreate,
    event_service: EventService = Depends(get_event_service),
    current_user=Depends(get_current_user_from_token),
):
    return event_service.create_event(event, current_user)


@router.get("/events/", response_model=EventListResponse)
def list_events_endpoint(
    q: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    location: Optional[str] = Query(default=None),
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    favorites_only: bool = False,
    upcoming_only: bool = False,
    sort_by: str = Query(default="date", pattern="^(date|created_at|title)$"),
    sort_order: str = Query(default="asc", pattern="^(asc|desc)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=9, ge=1, le=50),
    scope: str = Query(default="mine", pattern="^(mine|all)$"),
    event_service: EventService = Depends(get_event_service),
    current_user=Depends(get_current_user_from_token),
):
    params = EventQueryParams(
        q=q,
        category=category,
        location=location,
        date_from=date_from,
        date_to=date_to,
        favorites_only=favorites_only,
        upcoming_only=upcoming_only,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
        scope=scope,
    )
    return event_service.list_events(params, current_user)


@router.get("/events/favorites", response_model=EventListResponse)
def list_favorite_events_endpoint(
    event_service: EventService = Depends(get_event_service),
    current_user=Depends(get_current_user_from_token),
):
    params = EventQueryParams(favorites_only=True, page=1, page_size=50)
    return event_service.list_events(params, current_user)


@router.get("/events/{event_id}", response_model=EventRead)
def get_event_endpoint(
    event_id: int,
    event_service: EventService = Depends(get_event_service),
    current_user=Depends(get_current_user_from_token),
):
    return event_service.get_event(event_id, current_user)


@router.put("/events/{event_id}", response_model=EventRead)
def update_event_endpoint(
    event_id: int,
    event: EventUpdate,
    event_service: EventService = Depends(get_event_service),
    current_user=Depends(get_current_user_from_token),
):
    return event_service.update_event(event_id, event, current_user)


@router.patch("/events/{event_id}/favorite", response_model=EventRead)
def update_favorite_endpoint(
    event_id: int,
    payload: FavoriteUpdate,
    event_service: EventService = Depends(get_event_service),
    current_user=Depends(get_current_user_from_token),
):
    return event_service.update_event(event_id, EventUpdate(is_favorite=payload.is_favorite), current_user)


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event_endpoint(
    event_id: int,
    event_service: EventService = Depends(get_event_service),
    current_user=Depends(get_current_user_from_token),
):
    event_service.delete_event(event_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/events/{event_id}/files", response_model=list[EventFileRead])
def list_event_files(
    event_id: int,
    file_service: FileService = Depends(get_file_service),
    current_user=Depends(get_current_user_from_token),
):
    return file_service.list_files(event_id, current_user)


@router.post("/events/{event_id}/files", response_model=EventFileRead, status_code=status.HTTP_201_CREATED)
async def upload_event_file(
    event_id: int,
    file: UploadFile = File(...),
    file_service: FileService = Depends(get_file_service),
    current_user=Depends(get_current_user_from_token),
):
    return await file_service.upload_file(event_id, file, current_user)


@router.get("/files/{file_id}/access", response_model=FileAccessResponse)
def get_file_access(
    file_id: int,
    file_service: FileService = Depends(get_file_service),
    current_user=Depends(get_current_user_from_token),
):
    return file_service.get_file_access(file_id, current_user)


@router.get("/files/{file_id}/download")
def download_file(
    file_id: int,
    token: str,
    file_service: FileService = Depends(get_file_service),
):
    return file_service.download_file_with_token(file_id, token)


@router.delete("/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_file(
    file_id: int,
    file_service: FileService = Depends(get_file_service),
    current_user=Depends(get_current_user_from_token),
):
    file_service.delete_file(file_id, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
