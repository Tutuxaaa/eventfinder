# src/schemas/event.py  (или путь к вашему файлу)
from pydantic import BaseModel, field_validator, ConfigDict, ValidationError
from datetime import datetime, timezone
from typing import Optional

class EventBase(BaseModel):
    title: str
    description: Optional[str] = None
    date: Optional[datetime] = None
    location: Optional[str] = None
    image_url: Optional[str] = None
    price: Optional[str] = None
    category: Optional[str] = None
    is_favorite: Optional[bool] = False

    @field_validator('title')
    @classmethod
    def validate_title(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Название обязательно")
        return v

class EventCreate(EventBase):
    # в EventCreate требуем date (если нужно — можно оставить Optional)
    # здесь валидируем, что дата (если передана) в будущем
    date: datetime

    @field_validator('date')
    @classmethod
    def validate_date_create(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        if v < now:
            raise ValueError("Дата события должна быть в будущем")
        return v
    
# --- User schemas ---
class UserBase(BaseModel):
    email: str
    name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserRead(UserBase):
    id: int
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)
    
# --- Event schemas: при создании клиент не должен передавать owner_id ---
class EventCreate(EventBase):
    pass

class Event(EventBase):
    id: int
    created_at: Optional[datetime] = None
    owner_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[datetime] = None
    location: Optional[str] = None
    image_url: Optional[str] = None

    @field_validator('date')
    @classmethod
    def validate_date_update(cls, v: Optional[datetime]) -> Optional[datetime]:
        # если date не передана — пропускаем
        if v is None:
            return v
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        if v < now:
            raise ValueError("Дата события должна быть в будущем")
        return v

class Event(EventBase):
    id: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
