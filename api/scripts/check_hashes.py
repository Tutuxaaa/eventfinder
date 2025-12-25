from api.models.event import Event
from api.database import SessionLocal

db = SessionLocal()
try:
    for e in db.query(Event).all():
        print(e.id, e.title, getattr(e, "image_hash", None))
finally:
    db.close()