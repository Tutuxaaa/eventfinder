import { useEffect, useState } from "react";
import { Download, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { filesApi } from "../api";
import type { EventFileDto } from "../types";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface EventFilesPanelProps {
  eventId: number;
  canManage: boolean;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EventFilesPanel({ eventId, canManage }: EventFilesPanelProps) {
  const [files, setFiles] = useState<EventFileDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadFiles() {
    setLoading(true);
    try {
      const payload = await filesApi.list(eventId);
      setFiles(payload);
    } catch (error: any) {
      setMessage(error.message || "Не удалось загрузить вложения");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFiles();
  }, [eventId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage("");
    setUploading(true);
    try {
      await filesApi.upload(eventId, file);
      await loadFiles();
      setMessage("Файл успешно загружен")
    } catch (error: any) {
      setMessage(error.message || "Не удалось загрузить файл");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleOpen(fileId: number) {
    try {
      const payload = await filesApi.getAccess(fileId);
      window.open(payload.download_url, "_blank", "noopener,noreferrer");
    } catch (error: any) {
      setMessage(error.message || "Не удалось открыть файл");
    }
  }

  async function handleDelete(fileId: number) {
    try {
      await filesApi.delete(fileId);
      setFiles((prev) => prev.filter((item) => item.id !== fileId));
      setMessage("Файл удалён")
    } catch (error: any) {
      setMessage(error.message || "Не удалось удалить файл");
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="mb-1 flex items-center gap-2">
            <Paperclip className="h-5 w-5 text-primary" />
            Файлы события
          </h3>
          <p className="text-sm text-muted-foreground">
            ЛР3: загрузка, просмотр и удаление пользовательских файлов через объектное хранилище.
          </p>
        </div>
        {canManage && (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Загрузка..." : "Загрузить файл"}
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        )}
      </div>

      {message && <div className="mb-4 rounded-xl border p-3 text-sm">{message}</div>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Загрузка файлов...</p>
      ) : files.length === 0 ? (
        <p className="text-sm text-muted-foreground">К событию ещё не прикреплены файлы.</p>
      ) : (
        <div className="space-y-3">
          {files.map((file) => (
            <div key={file.id} className="flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium">{file.original_name}</p>
                <p className="text-sm text-muted-foreground">
                  {file.content_type} • {formatBytes(file.size_bytes)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => void handleOpen(file.id)}>
                  <Download className="mr-2 h-4 w-4" />
                  Открыть
                </Button>
                {canManage && (
                  <Button variant="destructive" onClick={() => void handleDelete(file.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Удалить
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
