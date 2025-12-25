# scripts/compare_local.py
from PIL import Image
import imagehash
from io import BytesIO
from database import SessionLocal
from models.event import Event

def compute_phash_from_file(path):
    with open(path, "rb") as f:
        img = Image.open(BytesIO(f.read())).convert("RGB")
        return str(imagehash.phash(img))

def show_distances(local_path):
    q_hex = compute_phash_from_file(local_path)
    q_int = int(q_hex, 16)
    db = SessionLocal()
    for ev in db.query(Event).filter(Event.image_hash.isnot(None)).all():
        try:
            s_hex = ev.image_hash
            s_int = int(s_hex, 16)
            dist = (q_int ^ s_int).bit_count()
            print(ev.id, ev.title, "dist=", dist, "stored_hash=", s_hex)
        except Exception:
            pass
    db.close()

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python scripts/compare_local.py path/to/photo.jpg")
    else:
        show_distances(sys.argv[1])
