from __future__ import annotations

from datetime import datetime, timedelta, timezone


def register_and_login(client):
    client.post("/api/v1/auth/register", json={"email": "student@example.com", "password": "secret123", "name": "Student"})
    response = client.post("/api/v1/auth/token", data={"username": "student@example.com", "password": "secret123"})
    assert response.status_code == 200, response.text
    return response.json()


def auth_headers(access_token: str):
    return {"Authorization": f"Bearer {access_token}"}


def test_auth_refresh_logout_flow(client):
    token_pair = register_and_login(client)
    refresh_response = client.post("/api/v1/auth/refresh", json={"refresh_token": token_pair["refresh_token"]})
    assert refresh_response.status_code == 200, refresh_response.text
    refreshed_pair = refresh_response.json()
    assert refreshed_pair["access_token"] != token_pair["access_token"]

    logout_response = client.post("/api/v1/auth/logout", json={"refresh_token": refreshed_pair["refresh_token"]})
    assert logout_response.status_code == 204

    refresh_after_logout = client.post("/api/v1/auth/refresh", json={"refresh_token": refreshed_pair["refresh_token"]})
    assert refresh_after_logout.status_code == 401


def test_event_creation_public_catalog_and_seo_endpoints(client):
    token_pair = register_and_login(client)
    event_response = client.post(
        "/api/v1/events/",
        headers=auth_headers(token_pair["access_token"]),
        json={
            "title": "Vilnius Jazz Night",
            "description": "SEO-ready public event page",
            "date": (datetime.now(timezone.utc) + timedelta(days=5)).isoformat(),
            "location": "Vilnius",
            "price": "25 EUR",
            "category": "Концерты",
            "image_url": "https://example.com/poster.jpg",
            "source_url": "https://example.com/source",
        },
    )
    assert event_response.status_code == 201, event_response.text
    event_id = event_response.json()["id"]

    public_list = client.get("/api/v1/public/events")
    assert public_list.status_code == 200
    assert public_list.json()["items"][0]["title"] == "Vilnius Jazz Night"

    public_detail = client.get(f"/api/v1/public/events/{event_id}")
    assert public_detail.status_code == 200
    assert public_detail.json()["source_url"] == "https://example.com/source"

    robots = client.get("/robots.txt")
    assert robots.status_code == 200
    assert "Sitemap:" in robots.text

    sitemap = client.get("/sitemap.xml")
    assert sitemap.status_code == 200
    assert f"/discover/{event_id}" in sitemap.text


def test_external_location_insights_endpoint(client):
    response = client.get("/api/v1/external/location-insights", params={"location": "Vilnius"})
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["source"] == "fake-open-meteo"
    assert payload["result"]["name"] == "Vilnius"


def test_events_filtering_sorting_and_pagination(client):
    token_pair = register_and_login(client)
    headers = auth_headers(token_pair["access_token"])

    fixtures = [
        ("Jazz Night", "Концерты", "Vilnius", 5),
        ("Art Expo", "Выставки", "Minsk", 10),
        ("Past Sport", "Спорт", "Minsk", -5),
    ]
    for title, category, location, day_offset in fixtures:
        response = client.post(
            "/api/v1/events/",
            headers=headers,
            json={
                "title": title,
                "category": category,
                "location": location,
                "date": (datetime.now(timezone.utc) + timedelta(days=day_offset)).isoformat(),
            },
        )
        assert response.status_code == 201, response.text

    by_search = client.get("/api/v1/events/", headers=headers, params={"q": "jazz"})
    assert by_search.status_code == 200, by_search.text
    assert by_search.json()["total"] == 1
    assert by_search.json()["items"][0]["title"] == "Jazz Night"

    by_partial_category = client.get("/api/v1/events/", headers=headers, params={"category": "кон"})
    assert by_partial_category.status_code == 200, by_partial_category.text
    assert by_partial_category.json()["total"] == 1
    assert by_partial_category.json()["items"][0]["category"] == "Концерты"

    by_location = client.get("/api/v1/events/", headers=headers, params={"location": "min"})
    assert by_location.status_code == 200, by_location.text
    assert by_location.json()["total"] == 2

    upcoming = client.get("/api/v1/events/", headers=headers, params={"upcoming_only": "true"})
    assert upcoming.status_code == 200, upcoming.text
    assert upcoming.json()["total"] == 2

    sorted_by_title = client.get("/api/v1/events/", headers=headers, params={"sort_by": "title", "sort_order": "asc"})
    assert [item["title"] for item in sorted_by_title.json()["items"]] == ["Art Expo", "Jazz Night", "Past Sport"]

    second_page = client.get("/api/v1/events/", headers=headers, params={"page": "2", "page_size": "1", "sort_by": "title"})
    assert second_page.status_code == 200, second_page.text
    assert second_page.json()["page"] == 2
    assert second_page.json()["items"][0]["title"] == "Jazz Night"
