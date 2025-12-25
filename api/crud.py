# api/crud.py (замените/дополните)
from sqlalchemy.orm import Session
from models.event import Event
from models.user import User
from schemas import EventCreate, EventUpdate, UserCreate

# --- User CRUD helpers ---
def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def create_user(db: Session, user_create: UserCreate, hashed_password: str):
    user = User(email=user_create.email, name=user_create.name, hashed_password=hashed_password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def get_user(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()

# --- Event CRUD (user-scoped) ---
def create_event(db: Session, event: EventCreate, owner_id: int):
    # event.model_dump() -> dict (pydantic v2)
    payload = event.model_dump()
    payload['owner_id'] = owner_id
    db_event = Event(**payload)
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

def get_events(db: Session, owner_id: int, skip: int = 0, limit: int = 100):
    return db.query(Event).filter(Event.owner_id == owner_id).offset(skip).limit(limit).all()

def get_event(db: Session, event_id: int, owner_id: int = None):
    q = db.query(Event).filter(Event.id == event_id)
    if owner_id is not None:
        q = q.filter(Event.owner_id == owner_id)
    return q.first()

def update_event(db: Session, event_id: int, event_update: EventUpdate, owner_id: int):
    db_event = get_event(db, event_id, owner_id)
    if not db_event:
        return None
    for key, value in event_update.model_dump(exclude_none=True).items():
        setattr(db_event, key, value)
    db.commit()
    db.refresh(db_event)
    return db_event

def delete_event(db: Session, event_id: int, owner_id: int):
    db_event = get_event(db, event_id, owner_id)
    if db_event:
        db.delete(db_event)
        db.commit()
        return True
    return False
