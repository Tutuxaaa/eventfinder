# api/models/event.py (пример полей)
from sqlalchemy import Column, ForeignKey, Integer, String, DateTime, Text, Boolean
from sqlalchemy.sql import func
from database import Base

class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    date = Column(DateTime, nullable=True)
    location = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    image_hash = Column(String(64), nullable=True)   # hex pHash
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    price = Column(String(50), nullable=True)
    category = Column(String(100), nullable=True)
    is_favorite = Column(Boolean, default=False)
    raw_text = Column(Text, nullable=True)
    parsed_by_ai = Column(Boolean, default=False)
    source_url = Column(String, nullable=True)
    
        # new: owner
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
