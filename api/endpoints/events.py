from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from schemas import Event, EventCreate, EventUpdate
from crud import create_event, get_events, get_event, update_event, delete_event

router = APIRouter()

@router.post("/events/", response_model=Event, status_code=status.HTTP_201_CREATED)
def create_event_endpoint(event: EventCreate, db: Session = Depends(get_db)):
    try:
        return create_event(db, event)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/events/", response_model=List[Event])
def read_events(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    events = get_events(db, skip=skip, limit=limit)
    return events

@router.get("/events/{event_id}", response_model=Event)
def read_event(event_id: int, db: Session = Depends(get_db)):
    event = get_event(db, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Событие не найдено")
    return event

@router.put("/events/{event_id}", response_model=Event)
def update_event_endpoint(event_id: int, event: EventUpdate, db: Session = Depends(get_db)):
    updated_event = update_event(db, event_id, event)
    if updated_event is None:
        raise HTTPException(status_code=404, detail="Событие не найдено")
    return updated_event

@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event_endpoint(event_id: int, db: Session = Depends(get_db)):
    if not delete_event(db, event_id):
        raise HTTPException(status_code=404, detail="Событие не найдено")