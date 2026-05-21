from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
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
    image_hash = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    price = Column(String(50), nullable=True)
    category = Column(String(100), nullable=True, index=True)
    is_favorite = Column(Boolean, default=False)
    raw_text = Column(Text, nullable=True)
    parsed_by_ai = Column(Boolean, default=False)
    source_url = Column(String, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    owner = relationship("User", back_populates="events")
    files = relationship("EventFile", back_populates="event", cascade="all, delete-orphan")
