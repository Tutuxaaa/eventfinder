from pydantic import BaseModel

class EventResponse(BaseModel):
    id: int
    title: str
    date: str
    location: str