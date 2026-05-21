"""Quick demo script for labs 1-3.
Run after starting the backend:
    python scripts/lab_smoke_demo.py
"""
from __future__ import annotations

import json
import requests

BASE = "http://localhost:8000/api/v1"


def register(email: str, password: str, name: str):
    response = requests.post(f"{BASE}/auth/register", json={"email": email, "password": password, "name": name})
    print("REGISTER", email, response.status_code, response.text)


def login(email: str, password: str):
    response = requests.post(f"{BASE}/auth/token", data={"username": email, "password": password})
    response.raise_for_status()
    payload = response.json()
    print("LOGIN", email, json.dumps(payload, indent=2)[:250], "...")
    return payload


def auth_headers(access_token: str):
    return {"Authorization": f"Bearer {access_token}"}


if __name__ == "__main__":
    register("user1@test.local", "Secret123", "User One")
    tokens = login("user1@test.local", "Secret123")
    me = requests.get(f"{BASE}/auth/me", headers=auth_headers(tokens["access_token"]))
    print("ME", me.status_code, me.text)

    created = requests.post(
        f"{BASE}/events/",
        json={"title": "Lab Demo Event", "category": "Концерты", "location": "Минск"},
        headers=auth_headers(tokens["access_token"]),
    )
    print("CREATE EVENT", created.status_code, created.text)

    catalog = requests.get(
        f"{BASE}/events/?q=Lab&category=Концерты&page=1&page_size=5&sort_by=created_at&sort_order=desc",
        headers=auth_headers(tokens["access_token"]),
    )
    print("FILTERED CATALOG", catalog.status_code, catalog.text)

    refreshed = requests.post(f"{BASE}/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    print("REFRESH", refreshed.status_code, refreshed.text)
