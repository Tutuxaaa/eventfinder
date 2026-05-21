from __future__ import annotations

from html import escape

from fastapi import APIRouter, Depends, Response

from dependencies import get_event_repository
from repositories.events import EventRepository
from settings import get_settings

router = APIRouter()
settings = get_settings()


@router.get("/robots.txt", include_in_schema=False)
def robots_txt():
    site_base = settings.site_base_url.rstrip("/")
    body = "\n".join(
        [
            "User-agent: *",
            "Allow: /",
            "Disallow: /admin",
            "Disallow: /dashboard",
            "Disallow: /favorites",
            f"Sitemap: {site_base}/sitemap.xml",
            "",
        ]
    )
    return Response(content=body, media_type="text/plain; charset=utf-8")


@router.get("/sitemap.xml", include_in_schema=False)
def sitemap_xml(events: EventRepository = Depends(get_event_repository)):
    site_base = settings.site_base_url.rstrip("/")
    urls = [
        {"loc": f"{site_base}/", "priority": "1.0", "changefreq": "daily"},
        {"loc": f"{site_base}/discover", "priority": "0.9", "changefreq": "hourly"},
    ]
    for event in events.get_recent_public(limit=200):
        urls.append(
            {
                "loc": f"{site_base}/discover/{event.id}",
                "priority": "0.8",
                "changefreq": "daily",
            }
        )

    parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for item in urls:
        parts.extend(
            [
                "<url>",
                f"<loc>{escape(item['loc'])}</loc>",
                f"<changefreq>{item['changefreq']}</changefreq>",
                f"<priority>{item['priority']}</priority>",
                "</url>",
            ]
        )
    parts.append("</urlset>")
    return Response(content="\n".join(parts), media_type="application/xml; charset=utf-8")
