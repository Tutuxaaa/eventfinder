# api/endpoints/photo_search.py
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from typing import List
import imagehash
from PIL import Image
from io import BytesIO
import requests
from sqlalchemy.orm import Session
from database import get_db
from models.event import Event
import binascii

router = APIRouter()

def compute_phash_from_pil(img: Image.Image):
    # 64-bit pHash
    ph = imagehash.phash(img)
    return ph  # imagehash.ImageHash object

def phash_hex_to_hashobj(hexstr: str):
    # восстановить ImageHash из hex
    return imagehash.ImageHash(hexstr=hexstr)

@router.post("/photo/", tags=["search"])
async def search_similar_events_by_photo(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # ^^^^ ИЗМЕНИЛИ ИМЯ ФУНКЦИИ
    # Ограничение типа/размера
    if file.content_type.split("/")[0] != "image":
        raise HTTPException(status_code=400, detail="Файл не является изображением")

    contents = await file.read()
    try:
        img = Image.open(BytesIO(contents)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail="Не удалось открыть изображение")

    query_hash = compute_phash_from_pil(img)

    # получить все события с непустым image_hash
    events = db.query(Event).filter(Event.image_hash.isnot(None)).all()

    results = []
    for ev in events:
        try:
            stored_hex = ev.image_hash
            stored_hash = phash_hex_to_hashobj(stored_hex)
            distance = query_hash - stored_hash  # Хэммингово расстояние
            results.append({"event_id": ev.id, "distance": int(distance)})
        except Exception:
            continue

    # сортировка по distance
    results.sort(key=lambda x: x["distance"])
    # взять первые 10, фильтровать по порогу (например distance <= 14)
    threshold = 14
    filtered = [r for r in results if r["distance"] <= threshold][:10]

    # вернуть события + расстояния
    out = []
    for r in filtered:
        ev = db.query(Event).get(r["event_id"])
        if ev:  # добавил проверку на None
            out.append({
                "id": ev.id,
                "title": ev.title,
                "image_url": ev.image_url,
                "distance": r["distance"],
            })

    return {"query_matches": out}