# api/endpoints/scrape.py
from fastapi import APIRouter, HTTPException, Body, Depends
from typing import List, Dict, Any
from bs4 import BeautifulSoup
import requests
from io import BytesIO
from PIL import Image
import imagehash
from dateutil import parser as dateparser
from database import get_db, SessionLocal
from sqlalchemy.orm import Session
from models.event import Event
import logging
import re
from urllib.parse import urljoin
from difflib import SequenceMatcher

router = APIRouter()
logger = logging.getLogger("scrape")
logging_basic = logging.basicConfig(level=logging.INFO)

# ---- helper utilities ----
HEADERS = {
    "User-Agent": "EventFinderBot/1.0 (+https://example.local) - minimal scraping for personal use"
}

def safe_get(url, timeout=8):
    r = requests.get(url, headers=HEADERS, timeout=timeout)
    r.raise_for_status()
    return r

def compute_phash_from_url(url):
    try:
        r = safe_get(url, timeout=6)
        img = Image.open(BytesIO(r.content)).convert("RGB")
        ph = imagehash.phash(img)
        return str(ph)
    except Exception as e:
        logger.debug("phash failed for %s: %s", url, e)
        return None

def text_similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, (a or "").lower(), (b or "").lower()).ratio()

def parse_json_ld(soup: BeautifulSoup) -> List[Dict[str, Any]]:
    out = []
    for tag in soup.find_all("script", type="application/ld+json"):
        try:
            import json
            data = json.loads(tag.string or "{}")
            # data can be a dict or list
            items = data if isinstance(data, list) else [data]
            for it in items:
                if it.get("@type") and "Event" in (it.get("@type") or ""):
                    title = it.get("name") or it.get("headline")
                    desc = it.get("description")
                    date = it.get("startDate") or it.get("datePublished")
                    location = None
                    loc = it.get("location")
                    if isinstance(loc, dict):
                        location = loc.get("name") or loc.get("address", {}).get("addressLocality")
                    image = it.get("image")
                    # image may be list or dict
                    if isinstance(image, list):
                        image = image[0]
                    if isinstance(image, dict):
                        image = image.get("url")
                    out.append({"title": title, "description": desc, "date": date, "location": location, "image": image})
        except Exception as e:
            logger.debug("json-ld parse error: %s", e)
    return out

def parse_open_graph(soup: BeautifulSoup, base_url: str) -> Dict[str, str]:
    og = {}
    for prop in ["og:title", "og:description", "og:image"]:
        tag = soup.find("meta", property=prop)
        if tag and tag.get("content"):
            og[prop] = urljoin(base_url, tag["content"])
    return og

def fallback_event_from_html(soup: BeautifulSoup, base_url: str) -> List[Dict[str, Any]]:
    # very heuristic: look for common patterns
    results = []
    for card in soup.select(".event, .card, .listing, .item")[:20]:
        try:
            title_tag = card.find(["h1","h2","h3",".title"], text=True)
            if not title_tag:
                title_tag = card.find(["h2","h3","a"])
            title = title_tag.get_text(strip=True) if title_tag else None
            desc = (card.find("p") or {}).get_text(strip=True) if card.find("p") else None
            img_tag = card.find("img")
            image = urljoin(base_url, img_tag["src"]) if img_tag and img_tag.get("src") else None
            date_text = None
            # try to find datetime attribute
            time_tag = card.find("time")
            if time_tag:
                date_text = time_tag.get("datetime") or time_tag.get_text()
            # try to find patterns like 12 июня 2025 or ISO
            if not date_text:
                txt = card.get_text(" ", strip=True)
                m = re.search(r"\b(\d{1,2}\s[а-яА-Яa-zA-Z]+\s\d{4})\b", txt)
                if m:
                    date_text = m.group(1)
            results.append({"title": title, "description": desc, "date": date_text, "location": None, "image": image})
        except Exception:
            continue
    return results

def normalize_date(dt_str):
    if not dt_str:
        return None
    try:
        return dateparser.parse(dt_str)
    except Exception:
        return None

# ---- dedup check ----
def is_duplicate(db: Session, candidate: Dict[str, Any], title_threshold=0.75, image_threshold=14) -> bool:
    # check by title similarity vs recent events
    title = (candidate.get("title") or "").strip()
    if title:
        recent = db.query(Event).order_by(Event.created_at.desc()).limit(200).all()
        for ev in recent:
            sim = text_similarity(title, ev.title or "")
            if sim >= title_threshold:
                logger.info("Duplicate by title: %s ~ %s (sim=%.2f)", title, ev.title, sim)
                return True
    # check by image hash distance
    img = candidate.get("image")
    if img:
        new_hash = compute_phash_from_url(img)
        if new_hash:
            for ev in db.query(Event).filter(Event.image_hash.isnot(None)).all():
                try:
                    dist = imagehash.hex_to_hash(new_hash) - imagehash.hex_to_hash(ev.image_hash)
                    if dist <= image_threshold:
                        logger.info("Duplicate by image hash: dist=%s", dist)
                        return True
                except Exception:
                    continue
    return False

# ---- main scraper entry point ----
@router.post("/scrape/", tags=["scrape"])
def scrape_url(payload: Dict = Body(...), db: Session = Depends(get_db)):
    """
    payload: {"url": "https://site.example/events/123", "max_items": 10}
    """
    url = payload.get("url")
    max_items = int(payload.get("max_items", 10))
    if not url:
        raise HTTPException(status_code=400, detail="Provide 'url' in body")

    try:
        r = safe_get(url, timeout=10)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Fetch failed: {e}")

    base = r.url
    soup = BeautifulSoup(r.text, "html.parser")

    found = []
    # 1) JSON-LD
    jsonld = parse_json_ld(soup)
    if jsonld:
        found.extend(jsonld)

    # 2) OG fallback (single event)
    og = parse_open_graph(soup, base)
    if og:
        found.append({"title": og.get("og:title"), "description": og.get("og:description"), "date": None, "location": None, "image": og.get("og:image")})

    # 3) heuristic list parsing
    heur = fallback_event_from_html(soup, base)
    if heur:
        found.extend(heur)

    # keep unique by title
    uniq = []
    seen_titles = set()
    for it in found:
        t = (it.get("title") or "").strip()
        if not t:
            continue
        if t.lower() in seen_titles:
            continue
        seen_titles.add(t.lower())
        uniq.append(it)
        if len(uniq) >= max_items:
            break

    added = []
    skipped = []
    for cand in uniq:
        # normalize things
        cand_title = cand.get("title")
        cand_date = normalize_date(cand.get("date"))
        cand_location = cand.get("location")
        cand_image = cand.get("image")
        # dedup
        dup = is_duplicate(db, {"title": cand_title, "image": cand_image})
        if dup:
            skipped.append({"title": cand_title})
            continue
        # compute image_hash (optional)
        img_hash = None
        if cand_image:
            img_hash = compute_phash_from_url(cand_image)
        # create Event entry
        ev = Event(
            title=cand_title or "Без названия",
            description=cand.get("description"),
            date=cand_date,
            location=cand_location,
            image_url=cand_image,
            image_hash=img_hash
        )
        db.add(ev)
        db.commit()
        db.refresh(ev)
        added.append({"id": ev.id, "title": ev.title})
    return {"url": url, "found": len(uniq), "added": added, "skipped": skipped}
