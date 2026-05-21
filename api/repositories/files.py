from __future__ import annotations

from sqlalchemy.orm import Session

from models.event_file import EventFile


class EventFileRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(
        self,
        *,
        event_id: int,
        uploaded_by_id: int,
        object_key: str,
        original_name: str,
        content_type: str,
        size_bytes: int,
    ) -> EventFile:
        file = EventFile(
            event_id=event_id,
            uploaded_by_id=uploaded_by_id,
            object_key=object_key,
            original_name=original_name,
            content_type=content_type,
            size_bytes=size_bytes,
        )
        self.db.add(file)
        self.db.commit()
        self.db.refresh(file)
        return file

    def get_by_id(self, file_id: int) -> EventFile | None:
        return self.db.query(EventFile).filter(EventFile.id == file_id).first()

    def list_for_event(self, event_id: int) -> list[EventFile]:
        return self.db.query(EventFile).filter(EventFile.event_id == event_id).order_by(EventFile.created_at.desc()).all()

    def delete(self, file: EventFile) -> None:
        self.db.delete(file)
        self.db.commit()
