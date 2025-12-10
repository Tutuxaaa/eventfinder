from sqlalchemy import Column, Integer, String, DateTime, Text
from database import Base
from datetime import datetime, timezone

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), index=True)
    description = Column(Text)
    date = Column(DateTime)
    location = Column(String(255))
    image_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.now(timezone.utc))