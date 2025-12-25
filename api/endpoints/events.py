# api/endpoints/events.py (корректируем)
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from schemas import Event, EventCreate, EventUpdate
from crud import create_event, get_events, get_event, update_event, delete_event
from endpoints.auth import get_current_user_from_token

router = APIRouter()

@router.post("/events/", response_model=Event, status_code=status.HTTP_201_CREATED)
def create_event_endpoint(event: EventCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user_from_token)):
    try:
        return create_event(db, event, owner_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/events/", response_model=List[Event])
def list_events_endpoint(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user=Depends(get_current_user_from_token)):
    return get_events(db, owner_id=current_user.id, skip=skip, limit=limit)

@router.get("/events/{event_id}", response_model=Event)
def get_event_endpoint(event_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user_from_token)):
    ev = get_event(db, event_id, owner_id=current_user.id)
    if not ev:
        raise HTTPException(status_code=404, detail="Событие не найдено")
    return ev

@router.put("/events/{event_id}", response_model=Event)
def update_event_endpoint(event_id: int, event: EventUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user_from_token)):
    updated_event = update_event(db, event_id, event, owner_id=current_user.id)
    if updated_event is None:
        raise HTTPException(status_code=404, detail="Событие не найдено или нет доступа")
    return updated_event

@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event_endpoint(event_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user_from_token)):
    if not delete_event(db, event_id, owner_id=current_user.id):
        raise HTTPException(status_code=404, detail="Событие не найдено или нет доступа")
