from __future__ import annotations

from datetime import date, datetime, time, timezone

from sqlalchemy import asc, desc, func, nullslast, or_
from sqlalchemy.orm import Session, joinedload

from models.event import Event
from schemas import EventCreate, EventQueryParams, EventUpdate, PublicEventQueryParams


class EventRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self, payload: EventCreate, owner_id: int) -> Event:
        event = Event(**payload.model_dump(), owner_id=owner_id)
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)
        return event

    def get_by_id(self, event_id: int) -> Event | None:
        return (
            self.db.query(Event)
            .options(joinedload(Event.files))
            .filter(Event.id == event_id)
            .first()
        )

    @staticmethod
    def _clean_text(value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


    @staticmethod

    @staticmethod
    def _contains_case_insensitive(column, value: str):
        variants = {value, value.lower(), value.upper(), value.capitalize(), value.title()}
        return or_(*(column.like(f"%{variant}%") for variant in variants if variant))

    def _start_of_day(value: date | datetime) -> datetime:
        if isinstance(value, datetime):
            return value
        return datetime.combine(value, time.min, tzinfo=timezone.utc)

    @staticmethod
    def _end_of_day(value: date | datetime) -> datetime:
        if isinstance(value, datetime):
            return value
        return datetime.combine(value, time.max, tzinfo=timezone.utc)

    def _apply_common_filters(self, query, params: EventQueryParams | PublicEventQueryParams):
        search = self._clean_text(params.q)
        category = self._clean_text(params.category)
        location = self._clean_text(params.location)

        if search:
            pattern = f"%{search}%"
            query = query.filter(
                or_(
                    self._contains_case_insensitive(Event.title, search),
                    self._contains_case_insensitive(Event.description, search),
                    self._contains_case_insensitive(Event.location, search),
                    self._contains_case_insensitive(Event.category, search),
                )
            )
        if category:
            # Категория на frontend может приходить как точное значение из select
            # или как введённый пользователем текст. Поэтому используем частичное
            # case-insensitive совпадение, чтобы фильтр не ломался от неполного ввода.
            query = query.filter(self._contains_case_insensitive(Event.category, category))
        if location:
            query = query.filter(self._contains_case_insensitive(Event.location, location))
        if getattr(params, "favorites_only", False):
            query = query.filter(Event.is_favorite.is_(True))
        if getattr(params, "date_from", None):
            query = query.filter(Event.date.is_not(None), Event.date >= self._start_of_day(params.date_from))
        if getattr(params, "date_to", None):
            query = query.filter(Event.date.is_not(None), Event.date <= self._end_of_day(params.date_to))
        if params.upcoming_only:
            query = query.filter(Event.date.is_not(None), Event.date >= datetime.now(timezone.utc))

        order_column = {
            "date": Event.date,
            "created_at": Event.created_at,
            "title": Event.title,
        }[params.sort_by]
        order_expr = desc(order_column) if params.sort_order == "desc" else asc(order_column)
        query = query.order_by(nullslast(order_expr), desc(Event.created_at))
        return query

    def list_filtered(self, params: EventQueryParams, *, viewer_id: int | None, can_view_all: bool) -> tuple[list[Event], int]:
        query = self.db.query(Event).options(joinedload(Event.files))
        if not can_view_all or params.scope == "mine":
            query = query.filter(Event.owner_id == viewer_id)
        query = self._apply_common_filters(query, params)
        total = query.with_entities(func.count(Event.id)).scalar() or 0
        offset = (params.page - 1) * params.page_size
        items = query.offset(offset).limit(params.page_size).all()
        return items, total

    def list_public(self, params: PublicEventQueryParams) -> tuple[list[Event], int]:
        query = self.db.query(Event).options(joinedload(Event.files))
        query = self._apply_common_filters(query, params)
        total = query.with_entities(func.count(Event.id)).scalar() or 0
        offset = (params.page - 1) * params.page_size
        items = query.offset(offset).limit(params.page_size).all()
        return items, total

    def get_recent_public(self, limit: int = 200) -> list[Event]:
        return (
            self.db.query(Event)
            .filter(Event.date.is_not(None), Event.date >= datetime.now(timezone.utc))
            .order_by(nullslast(asc(Event.date)), desc(Event.created_at))
            .limit(limit)
            .all()
        )

    def update(self, event: Event, payload: EventUpdate) -> Event:
        for key, value in payload.model_dump(exclude_none=True).items():
            setattr(event, key, value)
        self.db.commit()
        self.db.refresh(event)
        return event

    def delete(self, event: Event) -> None:
        self.db.delete(event)
        self.db.commit()
