from __future__ import annotations

from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from starlette.responses import Response

from auth import create_file_access_token, decode_token
from models.user import User
from repositories.events import EventRepository
from repositories.files import EventFileRepository
from schemas import FileAccessResponse
from services.access import AccessService
from settings import get_settings
from storage.backends import LocalObjectStorage

settings = get_settings()


class FileService:
    def __init__(self, event_files: EventFileRepository, events: EventRepository, access: AccessService, storage_backend):
        self.event_files = event_files
        self.events = events
        self.access = access
        self.storage_backend = storage_backend

    async def upload_file(self, event_id: int, file: UploadFile, current_user: User):
        event = self.events.get_by_id(event_id)
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Событие не найдено")
        self.access.ensure_event_edit_access(current_user, event)

        content_type = file.content_type or "application/octet-stream"
        if content_type not in settings.allowed_upload_content_types:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Недопустимый тип файла")

        data = await file.read()
        if len(data) == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Файл пустой")
        if len(data) > settings.max_upload_size_bytes:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Файл превышает допустимый размер")

        stored = self.storage_backend.save_bytes(
            data=data,
            original_name=file.filename or "upload.bin",
            content_type=content_type,
            folder=f"events/{event_id}",
        )
        return self.event_files.create(
            event_id=event_id,
            uploaded_by_id=current_user.id,
            object_key=stored.key,
            original_name=stored.original_name,
            content_type=stored.content_type,
            size_bytes=stored.size_bytes,
        )

    def list_files(self, event_id: int, current_user: User):
        event = self.events.get_by_id(event_id)
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Событие не найдено")
        self.access.ensure_event_view_access(current_user, event)
        return self.event_files.list_for_event(event_id)

    def delete_file(self, file_id: int, current_user: User) -> None:
        event_file = self.event_files.get_by_id(file_id)
        if not event_file:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Файл не найден")
        event = self.events.get_by_id(event_file.event_id)
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Событие не найдено")
        self.access.ensure_event_edit_access(current_user, event)
        self.storage_backend.delete(event_file.object_key)
        self.event_files.delete(event_file)

    def get_file_access(self, file_id: int, current_user: User) -> FileAccessResponse:
        event_file = self.event_files.get_by_id(file_id)
        if not event_file:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Файл не найден")
        event = self.events.get_by_id(event_file.event_id)
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Событие не найдено")
        self.access.ensure_event_view_access(current_user, event)

        if hasattr(self.storage_backend, "generate_presigned_download_url"):
            url = self.storage_backend.generate_presigned_download_url(
                event_file.object_key,
                expires_in=settings.file_access_expire_minutes * 60,
            )
            return FileAccessResponse(download_url=url, expires_in_seconds=settings.file_access_expire_minutes * 60)

        token = create_file_access_token(event_file.id)
        base = settings.public_api_base.rstrip("/")
        return FileAccessResponse(
            download_url=f"{base}/api/v1/files/{event_file.id}/download?token={token}",
            expires_in_seconds=settings.file_access_expire_minutes * 60,
        )

    def download_file_with_token(self, file_id: int, token: str) -> Response:
        payload = decode_token(token)
        if not payload or payload.get("type") != "file_access" or payload.get("file_id") != file_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Ссылка на файл недействительна")
        event_file = self.event_files.get_by_id(file_id)
        if not event_file:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Файл не найден")
        if not isinstance(self.storage_backend, LocalObjectStorage):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Этот метод доступен только для локального хранилища")
        data = self.storage_backend.read_bytes(event_file.object_key)
        return Response(
            content=data,
            media_type=event_file.content_type,
            headers={"Content-Disposition": f'inline; filename="{Path(event_file.original_name).name}"'},
        )
