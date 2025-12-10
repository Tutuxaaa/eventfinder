from pydantic import BaseModel, field_validator, ConfigDict
from datetime import datetime, timezone
from typing import Optional

class EventBase(BaseModel):
    title: str
    description: str
    date: datetime
    location: str
    image_url: Optional[str] = None

    @field_validator('date')
    @classmethod
    def validate_date(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        
        now = datetime.now(timezone.utc)
        if v < now:
            raise ValueError("Дата события должна быть в будущем")
        return v

    @field_validator('title')
    @classmethod
    def validate_title(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Название обязательно")
        return v

class EventCreate(EventBase):
    pass

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[datetime] = None
    location: Optional[str] = None
    image_url: Optional[str] = None

class Event(EventBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)