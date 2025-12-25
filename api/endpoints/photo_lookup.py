# endpoints/photo_lookup.py
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from PIL import Image, ImageFilter, ImageOps, ImageEnhance
import pytesseract
import imagehash
import io
from datetime import datetime, timezone
from dateutil import parser as dateparser
from rapidfuzz import fuzz
import re
from typing import Optional, Dict, Any
import requests
from bs4 import BeautifulSoup
import time
import logging

from database import get_db
from models.event import Event as EventModel

router = APIRouter()
logger = logging.getLogger("photo_lookup")

# thresholds
TITLE_FUZZY_THRESHOLD = 78
IMAGE_HASH_MAX_DIST = 8

# user-agent and basic headers for scraping
SCRAPE_HEADERS = {
    "User-Agent": "EventFinderBot/1.0 (+https://yourdomain.example) Python/requests"
}

# ---------------------------
# Utilities: OCR + preprocess
# ---------------------------
def preprocess_image(img: Image.Image) -> Image.Image:
    """
    Enhanced image preprocessing for better OCR using only Pillow
    """
    logger.info(f"Starting image preprocessing. Original size: {img.size}")
    
    # Convert to grayscale
    if img.mode != 'L':
        img = img.convert("L")
    
    # Increase contrast using autocontrast
    img = ImageOps.autocontrast(img, cutoff=5)
    
    # Apply sharpening
    img = img.filter(ImageFilter.SHARPEN)
    
    # Denoise using median filter
    img = img.filter(ImageFilter.MedianFilter(size=3))
    
    # Resize for better OCR
    min_size = 1200
    width, height = img.size
    
    # Scale up if image is too small
    if width < min_size or height < min_size:
        scale_factor = max(min_size / width, min_size / height)
        new_width = int(width * scale_factor)
        new_height = int(height * scale_factor)
        img = img.resize((new_width, new_height), Image.LANCZOS)
        logger.info(f"Scaled up to: {img.size}")
    
    # Apply additional contrast enhancement
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(2.0)  # Increase contrast
    
    # Apply brightness adjustment if needed
    enhancer = ImageEnhance.Brightness(img)
    img = enhancer.enhance(1.1)  # Slightly increase brightness
    
    logger.info(f"Preprocessing complete. Final size: {img.size}")
    return img


def ocr_image(pil_img: Image.Image) -> str:
    """
    Enhanced OCR with multiple configuration attempts
    """
    logger.info("Starting OCR recognition...")
    
    try:
        # Different PSM configurations for different text layouts
        configs = [
            ('--oem 3 --psm 6', 'Single uniform block'),
            ('--oem 3 --psm 11', 'Sparse text'),
            ('--oem 3 --psm 3', 'Fully automatic'),
            ('--oem 3 --psm 4', 'Single column of text'),
        ]
        
        best_text = ""
        best_config_name = ""
        
        for config, config_name in configs:
            try:
                text = pytesseract.image_to_string(pil_img, lang='rus+eng', config=config)
                
                # Clean the text
                text = re.sub(r'\s+', ' ', text).strip()
                
                logger.info(f"Config '{config_name}' - length: {len(text)} chars")
                
                # Check if we got reasonable text
                if len(text) > len(best_text) and len(text) > 10:
                    best_text = text
                    best_config_name = config_name
                    
            except Exception as e:
                logger.debug(f"Config '{config_name}' failed: {e}")
                continue
        
        if not best_text:
            # Fallback
            logger.warning("All configs failed, using fallback OCR")
            best_text = pytesseract.image_to_string(pil_img, lang='rus+eng')
            best_config_name = "Fallback"
        
        logger.info(f"Best OCR result using '{best_config_name}'")
        logger.info(f"Text preview: {best_text[:200]}...")
        
        return best_text
        
    except Exception as e:
        logger.error(f"OCR error: {e}")
        return ""


def compute_phash(pil_img: Image.Image) -> str:
    """Calculate perceptual hash for duplicate detection"""
    return str(imagehash.phash(pil_img))


def postprocess_ocr_text(text: str) -> str:
    """
    Fix common OCR errors for Russian text
    """
    logger.info("Starting OCR text postprocessing...")
    
    if not text:
        return ""
    
    # Replace common OCR errors
    replacements = {
        # Capital letters
        'A': 'А', 'B': 'В', 'C': 'С', 'E': 'Е', 'H': 'Н',
        'K': 'К', 'M': 'М', 'O': 'О', 'P': 'Р', 'T': 'Т',
        'X': 'Х', 'Y': 'У',
        # Lowercase letters
        'a': 'а', 'c': 'с', 'e': 'е', 'o': 'о', 'p': 'р',
        'x': 'х', 'y': 'у',
        # Common word errors
        'КОНЦЕ РТ': 'КОНЦЕРТ',
        'КОНЦЕ PT': 'КОНЦЕРТ',
        'ГPУППЫ': 'ГРУППЫ',
        'ГРУГПЫ': 'ГРУППЫ',
        'ЗВЕТДАМ': 'ЗВЁЗДАМ',
        'ЗBEЗДАМ': 'ЗВЁЗДАМ',
        'БУДУБЕУО': 'БУДУЩЕГО',
        'БУДУБЕГО': 'БУДУЩЕГО',
        'албом': 'альбом',
        'АЛ БОМ': 'АЛЬБОМ',
        'ФЕHИC': 'ФЕНИС',
        'ФЕHИС': 'ФЕНИС',
        'ФEНИC': 'ФЕНИС',
        'ОБНИМС': 'ФЕНИС',  # Common OCR error
    }
    
    # Apply replacements
    for wrong, correct in replacements.items():
        if wrong in text:
            text = text.replace(wrong, correct)
            logger.info(f"Fixed: '{wrong}' → '{correct}'")
    
    # Remove extra spaces inside words
    text = re.sub(r'(\b\w)\s+(\w\b)', r'\1\2', text)
    
    # Normalize spaces and quotes
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'[""„]', '"', text)
    text = text.strip()
    
    logger.info("Postprocessing complete")
    return text


def parse_date(text: str) -> Optional[datetime]:
    """
    Improved date parsing with support for various formats
    """
    logger.info("Parsing date from text...")
    
    month_map = {
        'января': 1, 'февраля': 2, 'марта': 3, 'апреля': 4, 
        'мая': 5, 'июня': 6, 'июля': 7, 'августа': 8,
        'сентября': 9, 'октября': 10, 'ноября': 11, 'декабря': 12,
        'янв': 1, 'фев': 2, 'мар': 3, 'апр': 4, 'май': 5, 'июн': 6,
        'июл': 7, 'авг': 8, 'сен': 9, 'окт': 10, 'ноя': 11, 'дек': 12
    }
    
    patterns = [
        # 25 июня, 20:00
        (r'(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря|янв|фев|мар|апр|май|июн|июл|авг|сен|окт|ноя|дек)[,\s]*(\d{1,2}):(\d{2})', 'day month time'),
        # 25 июня
        (r'(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря|янв|фев|мар|апр|май|июн|июл|авг|сен|окт|ноя|дек)', 'day month'),
        # 25.06.2025, 20:00
        (r'(\d{1,2})[\./-](\d{1,2})[\./-](\d{4})[,\s]*(\d{1,2}):(\d{2})', 'dd.mm.yyyy time'),
        # 25.06, 20:00
        (r'(\d{1,2})[\./-](\d{1,2})[,\s]*(\d{1,2}):(\d{2})', 'dd.mm time'),
    ]
    
    text_lower = text.lower()
    current_year = datetime.now().year
    
    for pattern, pattern_name in patterns:
        match = re.search(pattern, text_lower)
        if match:
            try:
                groups = match.groups()
                logger.info(f"Matched pattern '{pattern_name}': {groups}")
                
                # Pattern: day month time
                if len(groups) == 4 and groups[1] in month_map:
                    day, month_name, hour, minute = groups
                    month = month_map[month_name]
                    dt = datetime(current_year, month, int(day), int(hour), int(minute), tzinfo=timezone.utc)
                
                # Pattern: day month (no time)
                elif len(groups) == 2 and groups[1] in month_map:
                    day, month_name = groups
                    month = month_map[month_name]
                    dt = datetime(current_year, month, int(day), 20, 0, tzinfo=timezone.utc)  # Default 20:00
                
                # Pattern: dd.mm.yyyy, hh:mm
                elif len(groups) == 5:
                    day, month, year, hour, minute = groups
                    dt = datetime(int(year), int(month), int(day), int(hour), int(minute), tzinfo=timezone.utc)
                
                # Pattern: dd.mm, hh:mm
                elif len(groups) == 4 and groups[1].isdigit():
                    day, month, hour, minute = groups
                    dt = datetime(current_year, int(month), int(day), int(hour), int(minute), tzinfo=timezone.utc)
                
                else:
                    continue
                
                # Check if date is too far in the past
                now = datetime.now(timezone.utc)
                if dt < now.replace(day=1):  # If date is before start of current month
                    dt = dt.replace(year=current_year + 1)
                    logger.info(f"Date was in past, moved to next year: {dt}")
                
                logger.info(f"Parsed date: {dt.strftime('%d.%m.%Y %H:%M')}")
                return dt
                
            except Exception as e:
                logger.debug(f"Date parsing failed for pattern '{pattern_name}': {e}")
                continue
    
    logger.warning("No date found in text")
    return None


def parse_text_to_fields(text: str) -> Dict[str, Optional[Any]]:
    """
    Parse OCR text into structured fields
    """
    logger.info("Starting text parsing...")
    
    # Post-process OCR text
    text = postprocess_ocr_text(text)
    
    # Clean up
    text = re.sub(r'\s+', ' ', text)
    text = text.strip()
    
    logger.info(f"Cleaned text: {text[:200]}...")
    
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    all_text = " ".join(lines)
    
    # Parse title
    title = None
    
    # Pattern 1: "КОНЦЕРТ ГРУППЫ «...»"
    concert_match = re.search(r'КОНЦЕ?РТ\s+ГРУ[ПП]+Ы?\s*[«"]([^»"]{3,50})[»"]', text, re.I)
    if concert_match:
        title = concert_match.group(1).strip()
        logger.info(f"Found title (concert pattern): '{title}'")
    
    # Pattern 2: Text in quotes «...»
    if not title:
        quote_patterns = [
            r'«([^»]{3,50})»',
            r'"([^"]{3,50})"',
        ]
        
        for pattern in quote_patterns:
            matches = list(re.finditer(pattern, text))
            if matches:
                # Take first not too long quote
                for match in matches:
                    candidate = match.group(1).strip()
                    if 3 < len(candidate) < 50:
                        title = candidate
                        logger.info(f"Found title (quotes pattern): '{title}'")
                        break
                if title:
                    break
    
    # Pattern 3: First meaningful line
    if not title and lines:
        skip_words = {'концерт', 'конерт', 'группы', 'группа', 'новый', 'альбом', 'цена', 'руб', 'клуб'}
        for line in lines:
            line_lower = line.lower()
            # Check if line doesn't contain only service words
            if len(line) > 5 and len(line) < 100:
                words = set(line_lower.split())
                if not words.issubset(skip_words):
                    title = line
                    logger.info(f"Found title (first line): '{title}'")
                    break
    
    # Fallback
    if not title:
        title = "Событие без названия"
        logger.warning("No title found, using default")
    
    # Parse date
    parsed_date = parse_date(text)
    
    # Parse price
    price = None
    price_patterns = [
        r'[Цц]ена[:\s]*(\d{1,6})',
        r'(\d{3,6})\s*(?:₽|руб|РУБ|руб\.)',
        r'[Сс]тоимость[:\s]*(\d{1,6})',
    ]
    
    for pattern in price_patterns:
        match = re.search(pattern, text, re.I)
        if match:
            price = match.group(1)
            logger.info(f"Found price: {price} RUB")
            break
    
    if not price:
        logger.warning("No price found")
    
    # Parse location
    location = None
    location_patterns = [
        r'[Кк][Лл][Уу][Бб]\s*["\']?([А-ЯЁ][А-ЯЁа-яёA-Za-z\s]{2,30})(?=["\',\n]|$)',
        r'[Вв]\s+([А-ЯЁ][а-яё\s]{5,40})(?=,|\n|$)',
    ]
    
    for pattern in location_patterns:
        match = re.search(pattern, text)
        if match:
            loc = match.group(1).strip()
            # Clean up
            loc = re.sub(r'["\'\d]+', '', loc).strip()
            if len(loc) > 2:
                location = f"Клуб {loc}" if 'клуб' in pattern.lower() else loc
                logger.info(f"Found location: '{location}'")
                break
    
    if not location:
        logger.warning("No location found")
    
    logger.info("Parsing complete!")
    
    return {
        "title": title,
        "date": parsed_date,
        "price": price,
        "location": location,
        "raw_text": text
    }


# ---------------------------
# DB search
# ---------------------------
def find_existing_event(db: Session, parsed: Dict[str, Any], phash: str) -> Optional[EventModel]:
    """
    Find existing event by:
    1. Image perceptual hash
    2. Fuzzy title matching
    3. Date matching
    """
    logger.info("Searching for existing event in database...")
    
    events = db.query(EventModel).all()
    logger.info(f"Total events in DB: {len(events)}")
    
    # 1) Search by image hash
    for ev in events:
        try:
            if getattr(ev, "image_hash", None):
                dist = imagehash.hex_to_hash(ev.image_hash) - imagehash.hex_to_hash(phash)
                if dist <= IMAGE_HASH_MAX_DIST:
                    logger.info(f"Found match by image hash (distance: {dist}): Event #{ev.id}")
                    return ev
        except Exception as e:
            logger.debug(f"Image hash comparison failed: {e}")
            continue

    # 2) Search by fuzzy title matching
    title = parsed.get("title")
    if title and title != "Событие без названия":
        best = None
        best_score = 0
        for ev in events:
            score = fuzz.token_set_ratio(title, ev.title or "")
            if score > best_score:
                best = ev
                best_score = score
        
        if best_score >= TITLE_FUZZY_THRESHOLD:
            logger.info(f"Found match by title fuzzy matching (score: {best_score}): Event #{best.id}")
            return best
        else:
            logger.info(f"Best title match score: {best_score} (threshold: {TITLE_FUZZY_THRESHOLD})")

    # 3) Search by date
    if parsed.get("date"):
        parsed_date = parsed["date"].date()
        for ev in events:
            try:
                if getattr(ev, "date", None):
                    if ev.date.date() == parsed_date:
                        logger.info(f"Found match by date: Event #{ev.id}")
                        return ev
            except Exception:
                continue

    logger.info("No existing event found")
    return None


# ---------------------------
# Web scraping (fallback)
# ---------------------------
def safe_get(url, params=None, headers=None, timeout=8):
    """Safe HTTP GET with error handling"""
    headers = headers or SCRAPE_HEADERS
    try:
        r = requests.get(url, params=params, headers=headers, timeout=timeout)
        r.raise_for_status()
        time.sleep(0.3)  # Be polite to server
        return r.text
    except Exception as e:
        logger.debug(f"safe_get failed for {url}: {e}")
        return None


def search_kudago(query: str) -> Optional[Dict[str, Any]]:
    """Search on KudaGo"""
    logger.info(f"Searching on KudaGo: {query}")
    url = "https://kudago.com/events/"
    html = safe_get(url, params={"q": query})
    if not html:
        return None
    
    soup = BeautifulSoup(html, "lxml")
    card = soup.select_one(".post .title a, .card__title a")
    if not card:
        return None
    
    href = card.get("href")
    if href and href.startswith("/"):
        href = "https://kudago.com" + href
    
    page = safe_get(href)
    if not page:
        return None
    
    psoup = BeautifulSoup(page, "lxml")
    title = psoup.select_one("h1") and psoup.select_one("h1").get_text(strip=True)
    desc = psoup.select_one(".description") and psoup.select_one(".description").get_text(" ", strip=True)
    time_el = psoup.select_one(".date")
    date_text = time_el.get_text(" ", strip=True) if time_el else None
    
    logger.info(f"Found on KudaGo: {title}")
    return {"source": "kudago", "url": href, "title": title, "description": desc, "date_text": date_text}


def search_afisha_ru(query: str) -> Optional[Dict[str, Any]]:
    """Search on Afisha.ru"""
    logger.info(f"Searching on Afisha.ru: {query}")
    url = "https://www.afisha.ru/search/"
    html = safe_get(url, params={"q": query})
    if not html:
        return None
    
    soup = BeautifulSoup(html, "lxml")
    card = soup.select_one(".o-teaser")
    if not card:
        return None
    
    ahref = card.select_one("a")
    if not ahref:
        return None
    
    href = ahref.get("href")
    if href and href.startswith("/"):
        href = "https://www.afisha.ru" + href
    
    page = safe_get(href)
    if not page:
        return None
    
    psoup = BeautifulSoup(page, "lxml")
    title = psoup.select_one("h1") and psoup.select_one("h1").get_text(strip=True)
    desc = psoup.select_one(".b-event__description") and psoup.select_one(".b-event__description").get_text(" ", strip=True)
    
    logger.info(f"Found on Afisha.ru: {title}")
    return {"source": "afisha.ru", "url": href, "title": title, "description": desc}


def search_yandex_afisha(query: str) -> Optional[Dict[str, Any]]:
    """Search on Яндекс.Афише"""
    logger.info(f"Searching on Yandex.Afisha: {query}")
    url = "https://afisha.yandex.ru/search"
    html = safe_get(url, params={"what": query})
    if not html:
        return None
    
    soup = BeautifulSoup(html, "lxml")
    card = soup.select_one(".search-snippet__title a, .event-card a")
    if not card:
        return None
    
    href = card.get("href")
    if href and href.startswith("/"):
        href = "https://afisha.yandex.ru" + href
    
    page = safe_get(href)
    if not page:
        return None
    
    psoup = BeautifulSoup(page, "lxml")
    title = psoup.select_one("h1") and psoup.select_one("h1").get_text(strip=True)
    desc = psoup.select_one(".event-description") and psoup.select_one(".event-description").get_text(" ", strip=True)
    
    logger.info(f"Found on Yandex.Afisha: {title}")
    return {"source": "yandex.afisha", "url": href, "title": title, "description": desc}


def search_external_sites(query: str):
    """Search on external event sites"""
    logger.info(f"Searching external sites for: {query}")
    
    for fn in (search_kudago, search_afisha_ru, search_yandex_afisha):
        try:
            res = fn(query)
            if res:
                return res
        except Exception as e:
            logger.debug(f"Scraper {fn.__name__} failed: {e}")
            continue
    
    logger.info("No results from external sites")
    return None


# ---------------------------
# Main endpoint
# ---------------------------
@router.post("/photo/lookup")
async def photo_lookup(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Endpoint for recognizing events from poster photos
    """
    logger.info(f"\n{'='*60}")
    logger.info(f"NEW PHOTO LOOKUP REQUEST")
    logger.info(f"{'='*60}")
    logger.info(f"File: {file.filename}")
    
    # Read file
    contents = await file.read()
    
    try:
        pil_img = Image.open(io.BytesIO(contents))
        logger.info(f"Image loaded: {pil_img.size}, mode: {pil_img.mode}")
    except Exception as e:
        logger.error(f"Failed to open image: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid image file: {e}")

    # Stage 1: Preprocessing & OCR
    logger.info(f"\n{'─'*60}")
    logger.info(f"STAGE 1: IMAGE PREPROCESSING & OCR")
    logger.info(f"{'─'*60}")
    
    try:
        preprocessed_img = preprocess_image(pil_img)
        phash = compute_phash(preprocessed_img)
        logger.info(f"Image hash: {phash}")
        
        text = ocr_image(preprocessed_img)
        logger.info(f"OCR result ({len(text)} chars): {text[:200]}...")
        
    except Exception as e:
        logger.error(f"Preprocessing/OCR failed: {e}")
        raise HTTPException(status_code=500, detail=f"Image processing failed: {e}")

    # Stage 2: Text parsing
    logger.info(f"\n{'─'*60}")
    logger.info(f"STAGE 2: TEXT PARSING")
    logger.info(f"{'─'*60}")
    
    try:
        parsed = parse_text_to_fields(text)
        logger.info(f"\nPARSED DATA:")
        logger.info(f"  Title: {parsed.get('title')}")
        logger.info(f"  Date: {parsed.get('date')}")
        logger.info(f"  Price: {parsed.get('price')}")
        logger.info(f"  Location: {parsed.get('location')}")
    except Exception as e:
        logger.error(f"Parsing failed: {e}")
        parsed = {
            "title": "Событие без названия",
            "date": None,
            "price": None,
            "location": None,
            "raw_text": text
        }

    # Stage 3: Database search
    logger.info(f"\n{'─'*60}")
    logger.info(f"STAGE 3: DATABASE SEARCH")
    logger.info(f"{'─'*60}")
    
    match = find_existing_event(db, parsed, phash)
    if match:
        logger.info(f"\nFOUND EXISTING EVENT IN DATABASE!")
        logger.info(f"  Event ID: {match.id}")
        logger.info(f"  Title: {match.title}")
        logger.info(f"{'='*60}\n")
        
        return JSONResponse(content={
            "action": "matched",
            "event_id": match.id,
            "event": {
                "id": match.id,
                "title": match.title,
                "description": match.description or "",
                "date": match.date.isoformat() if getattr(match, "date", None) else None,
                "location": match.location or "",
                "price": match.price,
                "image_hash": getattr(match, "image_hash", None),
            }
        })

    # Stage 4: External sites search
    logger.info(f"\n{'─'*60}")
    logger.info(f"STAGE 4: EXTERNAL SITES SEARCH")
    logger.info(f"{'─'*60}")
    
    query = parsed.get("title") or parsed.get("raw_text", "")[:100]
    external = None
    
    if query and query != "Событие без названия":
        external = search_external_sites(query)

    if external:
        logger.info(f"\nFOUND ON EXTERNAL SITE: {external.get('source')}")
        
        try:
            # Create event from external data
            title = external.get("title") or parsed.get("title") or "Новое событие"
            desc = external.get("description") or parsed.get("raw_text") or ""
            
            # Parse date from external source
            dt = None
            if external.get("date_text"):
                try:
                    dt = dateparser.parse(external["date_text"], languages=['ru'], fuzzy=True)
                    if dt:
                        dt = dt.astimezone(timezone.utc)
                except Exception:
                    pass
            
            ev_create = EventModel(
                title=title,
                description=desc,
                date=dt or parsed.get("date") or datetime.now(timezone.utc),
                location=parsed.get("location") or "",
                price=parsed.get("price"),
                image_url=None,
                image_hash=phash,
                raw_text=parsed.get("raw_text"),
                parsed_by_ai=True,
                source_url=external.get("url"),
                created_at=datetime.now(timezone.utc)
            )
            
            db.add(ev_create)
            db.commit()
            db.refresh(ev_create)
            
            logger.info(f"Created event from external data: Event #{ev_create.id}")
            
            return JSONResponse(content={
                "action": "found_external",
                "event_id": ev_create.id,
                "event": {
                    "id": ev_create.id,
                    "title": ev_create.title,
                    "description": ev_create.description,
                    "date": ev_create.date.isoformat() if ev_create.date else None,
                    "location": ev_create.location,
                    "price": ev_create.price,
                    "source_url": ev_create.source_url
                }
            })
            
        except Exception as e:
            logger.exception(f"Failed to create event from external data: {e}")

    # Stage 5: Create new event
    logger.info(f"\n{'─'*60}")
    logger.info(f"STAGE 5: CREATING NEW EVENT")
    logger.info(f"{'─'*60}")
    
    try:
        title = parsed.get("title") or "Новое событие"
        desc = parsed.get("raw_text") or ""
        
        # Use parsed date or current with default time
        event_date = parsed.get("date")
        if not event_date:
            event_date = datetime.now(timezone.utc).replace(hour=20, minute=0, second=0, microsecond=0)
            logger.info(f"Using default date: {event_date}")
        
        ev_create = EventModel(
            title=title,
            description=desc,
            date=event_date,
            location=parsed.get("location") or "",
            price=parsed.get("price"),
            image_url=None,
            image_hash=phash,
            raw_text=parsed.get("raw_text"),
            parsed_by_ai=True,
            created_at=datetime.now(timezone.utc)
        )
        
        db.add(ev_create)
        db.commit()
        db.refresh(ev_create)
        
        logger.info(f"\nCREATED NEW EVENT!")
        logger.info(f"  Event ID: {ev_create.id}")
        logger.info(f"  Title: {ev_create.title}")
        logger.info(f"  Date: {ev_create.date}")
        logger.info(f"  Location: {ev_create.location}")
        logger.info(f"  Price: {ev_create.price}")
        logger.info(f"{'='*60}\n")
        
        return JSONResponse(content={
            "action": "created",
            "event_id": ev_create.id,
            "event": {
                "id": ev_create.id,
                "title": ev_create.title,
                "description": ev_create.description,
                "date": ev_create.date.isoformat() if ev_create.date else None,
                "location": ev_create.location,
                "price": ev_create.price,
                "raw_text": ev_create.raw_text
            }
        })
        
    except Exception as e:
        logger.exception(f"Failed to create event: {e}")
        raise HTTPException(status_code=500, detail="Failed to create event")