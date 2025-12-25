# endpoints/photo_debug.py  (вставь в api/endpoints)
from fastapi import APIRouter, File, UploadFile, HTTPException, Depends
from io import BytesIO
from PIL import Image
import imagehash
from database import get_db
from sqlalchemy.orm import Session
from models.event import Event

router = APIRouter()

def phash_hex_to_int(hexstr: str) -> int:
    # hex string -> int (универсально)
    return int(hexstr, 16)

@router.post("/photo/debug/", tags=["search"])
async def photo_debug(file: UploadFile = File(...), db: Session = Depends(get_db), top_n: int = 20):
    if not file.content_type.startswith("image"):
        raise HTTPException(400, "Требуется изображение")

    contents = await file.read()
    try:
        img = Image.open(BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(400, "Не удалось открыть изображение")

    query_hash = imagehash.phash(img)  # по умолчанию hash_size=8
    q_hex = str(query_hash)
    q_int = int(q_hex, 16)

    # получаем все события с заполненным image_hash
    events = db.query(Event).filter(Event.image_hash.isnot(None)).all()
    results = []
    for ev in events:
        try:
            s_hex = ev.image_hash
            s_int = phash_hex_to_int(s_hex)
            xor = q_int ^ s_int
            distance = xor.bit_count()  # fast bitcount, Python 3.8+
            results.append({
                "id": ev.id,
                "title": ev.title,
                "image_url": ev.image_url,
                "stored_hash": s_hex,
                "distance": int(distance)
            })
        except Exception:
            continue

    results.sort(key=lambda r: r["distance"])
    return {
        "query_hash": q_hex,
        "matches": results[:top_n],
        "total_checked": len(results)
    }
