from __future__ import annotations

from datetime import date, datetime, timezone
from math import ceil
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from models.user import UserRole


class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(min_length=6, max_length=128)


class UserRead(UserBase):
    id: int
    role: Literal["user", "manager", "admin"]
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class UserRoleUpdate(BaseModel):
    role: Literal["user", "manager", "admin"]


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class EventBase(BaseModel):
    title: str
    description: Optional[str] = None
    date: Optional[datetime] = None
    location: Optional[str] = None
    image_url: Optional[str] = None
    price: Optional[str] = None
    category: Optional[str] = None
    source_url: Optional[str] = None
    is_favorite: bool = False

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("Название обязательно")
        return value.strip()

    @field_validator("date")
    @classmethod
    def normalize_date(cls, value: Optional[datetime]) -> Optional[datetime]:
        if value is None:
            return value
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[datetime] = None
    location: Optional[str] = None
    image_url: Optional[str] = None
    price: Optional[str] = None
    category: Optional[str] = None
    source_url: Optional[str] = None
    is_favorite: Optional[bool] = None

    @field_validator("title")
    @classmethod
    def validate_optional_title(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("Название обязательно")
        return value

    @field_validator("date")
    @classmethod
    def normalize_optional_date(cls, value: Optional[datetime]) -> Optional[datetime]:
        if value is None:
            return value
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value


class EventFileRead(BaseModel):
    id: int
    event_id: int
    original_name: str
    content_type: str
    size_bytes: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class EventRead(EventBase):
    id: int
    created_at: Optional[datetime] = None
    owner_id: int
    files: list[EventFileRead] = []

    model_config = ConfigDict(from_attributes=True)


class PublicEventRead(EventRead):
    pass


class FavoriteUpdate(BaseModel):
    is_favorite: bool


class EventListResponse(BaseModel):
    items: list[EventRead]
    total: int
    page: int
    page_size: int
    total_pages: int

    @classmethod
    def build(cls, *, items: list[EventRead], total: int, page: int, page_size: int) -> "EventListResponse":
        total_pages = max(1, ceil(total / page_size)) if page_size else 1
        return cls(items=items, total=total, page=page, page_size=page_size, total_pages=total_pages)


class PublicEventListResponse(BaseModel):
    items: list[PublicEventRead]
    total: int
    page: int
    page_size: int
    total_pages: int

    @classmethod
    def build(cls, *, items: list[PublicEventRead], total: int, page: int, page_size: int) -> "PublicEventListResponse":
        total_pages = max(1, ceil(total / page_size)) if page_size else 1
        return cls(items=items, total=total, page=page, page_size=page_size, total_pages=total_pages)


class EventQueryParams(BaseModel):
    q: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    favorites_only: bool = False
    upcoming_only: bool = False
    sort_by: Literal["date", "created_at", "title"] = "date"
    sort_order: Literal["asc", "desc"] = "asc"
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=9, ge=1, le=50)
    scope: Literal["mine", "all"] = "mine"


class PublicEventQueryParams(BaseModel):
    q: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    upcoming_only: bool = True
    sort_by: Literal["date", "created_at", "title"] = "date"
    sort_order: Literal["asc", "desc"] = "asc"
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=12, ge=1, le=50)


class FileAccessResponse(BaseModel):
    download_url: str
    expires_in_seconds: int


class RoleMatrixRow(BaseModel):
    role: str
    allowed_actions: list[str]


class RoleMatrixResponse(BaseModel):
    rows: list[RoleMatrixRow]
    notes: list[str]


class LocationInsightWeather(BaseModel):
    date: str
    temperature_max: Optional[float] = None
    temperature_min: Optional[float] = None
    weather_code: Optional[int] = None
    summary: str


class LocationInsightDay(BaseModel):
    name: str
    latitude: float
    longitude: float
    timezone: str
    country: Optional[str] = None
    admin1: Optional[str] = None
    current_temperature: Optional[float] = None
    current_wind_speed: Optional[float] = None
    daily: list[LocationInsightWeather] = []


class LocationInsightResponse(BaseModel):
    location_query: str
    source: str
    generated_at: datetime
    result: Optional[LocationInsightDay] = None


DEFAULT_ROLE_MATRIX = RoleMatrixResponse(
    rows=[
        RoleMatrixRow(
            role=UserRole.USER,
            allowed_actions=[
                "view_own_events",
                "create_events",
                "edit_own_events",
                "delete_own_events",
                "toggle_favorites",
                "upload_files_to_own_events",
            ],
        ),
        RoleMatrixRow(
            role=UserRole.MANAGER,
            allowed_actions=[
                "view_all_events",
                "create_events",
                "edit_any_event",
                "manage_files_for_any_event",
                "view_all_uploaded_files",
            ],
        ),
        RoleMatrixRow(
            role=UserRole.ADMIN,
            allowed_actions=[
                "view_all_events",
                "create_events",
                "edit_any_event",
                "delete_any_event",
                "manage_files_for_any_event",
                "list_users",
                "change_user_roles",
            ],
        ),
    ],
    notes=[
        "Принцип минимальных привилегий: обычный пользователь работает только со своими событиями.",
        "Менеджер может модерировать и редактировать каталог, но не управляет ролями пользователей.",
        "Администратор управляет ролями и имеет полный доступ к административным операциям.",
    ],
)
