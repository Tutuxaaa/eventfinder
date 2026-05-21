from __future__ import annotations

import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

PROJECT_ROOT = Path(__file__).resolve().parents[1]
API_ROOT = PROJECT_ROOT / "api"
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from database import Base, get_db  # noqa: E402
from dependencies import get_external_insights_service  # noqa: E402
from main import app  # noqa: E402


class FakeExternalInsightsService:
    def get_location_insights(self, location: str):
        from datetime import datetime, timezone
        return {
            "location_query": location,
            "source": "fake-open-meteo",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "result": {
                "name": location,
                "latitude": 54.6872,
                "longitude": 25.2797,
                "timezone": "Europe/Vilnius",
                "country": "Lithuania",
                "admin1": "Vilnius",
                "current_temperature": 18.0,
                "current_wind_speed": 8.0,
                "daily": [
                    {
                        "date": "2026-04-20",
                        "temperature_max": 20.0,
                        "temperature_min": 12.0,
                        "weather_code": 1,
                        "summary": "Преимущественно ясно",
                    }
                ],
            },
        }


@pytest.fixture()
def client(tmp_path):
    db_path = tmp_path / "test.db"
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_external_insights_service] = lambda: FakeExternalInsightsService()

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
