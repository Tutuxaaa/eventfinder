from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from time import monotonic
from typing import Any

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from schemas import LocationInsightDay, LocationInsightResponse, LocationInsightWeather
from settings import get_settings


class ExternalServiceError(RuntimeError):
    pass


@dataclass
class CacheEntry:
    created_at: float
    value: LocationInsightResponse


class SlidingWindowLimiter:
    def __init__(self, max_requests: int, per_seconds: int):
        self.max_requests = max_requests
        self.per_seconds = per_seconds
        self.events: deque[float] = deque()

    def check(self) -> None:
        now = monotonic()
        while self.events and self.events[0] <= now - self.per_seconds:
            self.events.popleft()
        if len(self.events) >= self.max_requests:
            raise ExternalServiceError("Превышен лимит обращений к внешнему API. Повторите запрос позже.")
        self.events.append(now)


WEATHER_CODE_MAP = {
    0: "Ясно",
    1: "Преимущественно ясно",
    2: "Переменная облачность",
    3: "Пасмурно",
    45: "Туман",
    48: "Изморозь",
    51: "Лёгкая морось",
    53: "Морось",
    55: "Сильная морось",
    61: "Небольшой дождь",
    63: "Дождь",
    65: "Сильный дождь",
    71: "Небольшой снег",
    73: "Снег",
    75: "Сильный снег",
    80: "Ливень",
    81: "Ливень",
    82: "Сильный ливень",
    95: "Гроза",
}


class ExternalInsightsService:
    def __init__(self):
        self.settings = get_settings()
        retries = Retry(
            total=self.settings.external_api_retries,
            connect=self.settings.external_api_retries,
            read=self.settings.external_api_retries,
            status=self.settings.external_api_retries,
            backoff_factor=0.3,
            status_forcelist=(429, 500, 502, 503, 504),
            allowed_methods=frozenset(["GET"]),
        )
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": self.settings.external_api_user_agent})
        self.session.mount("https://", HTTPAdapter(max_retries=retries))
        self.session.mount("http://", HTTPAdapter(max_retries=retries))
        self.cache: dict[str, CacheEntry] = {}
        self.cache_ttl_seconds = 600
        self.rate_limiter = SlidingWindowLimiter(
            max_requests=self.settings.external_api_requests_per_minute,
            per_seconds=60,
        )

    def _get_json(self, url: str, *, params: dict[str, Any]) -> dict[str, Any]:
        self.rate_limiter.check()
        response = self.session.get(url, params=params, timeout=self.settings.external_api_timeout_seconds)
        response.raise_for_status()
        return response.json()

    def get_location_insights(self, location: str) -> LocationInsightResponse:
        query = location.strip()
        if not query:
            raise ExternalServiceError("Нужно указать локацию для внешнего запроса.")
        cache_key = query.casefold()
        cached = self.cache.get(cache_key)
        now = monotonic()
        if cached and now - cached.created_at <= self.cache_ttl_seconds:
            return cached.value

        try:
            geocoding = self._get_json(
                f"{self.settings.open_meteo_geocoding_base_url}/search",
                params={"name": query, "count": 1, "language": "ru", "format": "json"},
            )
        except Exception as exc:
            raise ExternalServiceError("Внешний API недоступен или ответил с ошибкой.") from exc

        results = geocoding.get("results") or []
        if not results:
            value = LocationInsightResponse(location_query=query, source="open-meteo", generated_at=datetime.now(timezone.utc), result=None)
            self.cache[cache_key] = CacheEntry(created_at=now, value=value)
            return value

        place = results[0]
        latitude = float(place["latitude"])
        longitude = float(place["longitude"])
        try:
            weather = self._get_json(
                f"{self.settings.open_meteo_weather_base_url}/forecast",
                params={
                    "latitude": latitude,
                    "longitude": longitude,
                    "current": "temperature_2m,wind_speed_10m",
                    "daily": "weather_code,temperature_2m_max,temperature_2m_min",
                    "forecast_days": 3,
                    "timezone": place.get("timezone") or "auto",
                },
            )
        except Exception as exc:
            raise ExternalServiceError("Внешний API недоступен или ответил с ошибкой.") from exc

        daily = weather.get("daily") or {}
        days: list[LocationInsightWeather] = []
        for idx, day in enumerate(daily.get("time", [])[:3]):
            code = (daily.get("weather_code") or [None])[idx]
            days.append(
                LocationInsightWeather(
                    date=day,
                    temperature_max=(daily.get("temperature_2m_max") or [None])[idx],
                    temperature_min=(daily.get("temperature_2m_min") or [None])[idx],
                    weather_code=code,
                    summary=WEATHER_CODE_MAP.get(code, "Погодные данные получены"),
                )
            )

        value = LocationInsightResponse(
            location_query=query,
            source="open-meteo",
            generated_at=datetime.now(timezone.utc),
            result=LocationInsightDay(
                name=place.get("name") or query,
                latitude=latitude,
                longitude=longitude,
                timezone=weather.get("timezone") or place.get("timezone") or "UTC",
                country=place.get("country"),
                admin1=place.get("admin1"),
                current_temperature=(weather.get("current") or {}).get("temperature_2m"),
                current_wind_speed=(weather.get("current") or {}).get("wind_speed_10m"),
                daily=days,
            ),
        )
        self.cache[cache_key] = CacheEntry(created_at=now, value=value)
        return value
