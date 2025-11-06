from fastapi import APIRouter

router = APIRouter()

@router.get("/events")
async def get_events():
    return {"message": "Список событий"}

@router.get("/events/{event_id}")
async def get_event(event_id: int):
    return {"event_id": event_id, "title": "Концерт"}