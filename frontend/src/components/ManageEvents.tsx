import { useMemo, useState } from "react";
import { Edit3, Plus, Search, Trash2 } from "lucide-react";
import type { EventFormData } from "../api";
import type { EventDto, UserRole } from "../types";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { EventFormDialog } from "./EventFormDialog";

interface ManageEventsProps {
  events: EventDto[];
  currentUserId: number;
  currentUserRole: UserRole;
  onCreate: (payload: EventFormData) => Promise<void>;
  onUpdate: (eventId: string, payload: EventFormData) => Promise<void>;
  onDelete: (eventId: string) => Promise<void>;
}

function canEditEvent(event: EventDto, currentUserId: number, currentUserRole: UserRole) {
  return event.owner_id === currentUserId || currentUserRole === "manager" || currentUserRole === "admin";
}

function canDeleteEvent(event: EventDto, currentUserId: number, currentUserRole: UserRole) {
  return event.owner_id === currentUserId || currentUserRole === "admin";
}

export function ManageEvents({ events, currentUserId, currentUserRole, onCreate, onUpdate, onDelete }: ManageEventsProps) {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventDto | null>(null);

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return events;
    return events.filter((event) => {
      return [event.title, event.category, event.location]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [events, search]);

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="mb-1">Управление каталогом</h2>
          <p className="text-muted-foreground">
            CRUD событий с учётом ролей. Менеджер может редактировать весь каталог, администратор — ещё и удалять любые записи.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить событие
        </Button>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по названию, категории или локации" className="pl-9" />
        </div>
      </Card>

      <div className="grid gap-4">
        {filteredEvents.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">События не найдены. Добавьте первое событие или измените строку поиска.</Card>
        ) : (
          filteredEvents.map((event) => {
            const canEdit = canEditEvent(event, currentUserId, currentUserRole);
            const canDelete = canDeleteEvent(event, currentUserId, currentUserRole);
            return (
              <Card key={event.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h3>{event.title}</h3>
                    <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">{event.category || "Событие"}</span>
                    <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">owner #{event.owner_id}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {event.date ? new Date(event.date).toLocaleString("ru-RU") : "Дата уточняется"} • {event.location || "Локация уточняется"}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{event.description || "Описание скоро появится."}</p>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditingEvent(event)} disabled={!canEdit}>
                    <Edit3 className="mr-2 h-4 w-4" />
                    Изменить
                  </Button>
                  <Button variant="destructive" onClick={() => void onDelete(String(event.id))} disabled={!canDelete}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Удалить
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <EventFormDialog open={createOpen} mode="create" onClose={() => setCreateOpen(false)} onSubmit={onCreate} />

      <EventFormDialog
        open={Boolean(editingEvent)}
        mode="edit"
        initialData={
          editingEvent
            ? {
                title: editingEvent.title,
                description: editingEvent.description || "",
                category: editingEvent.category || "",
                location: editingEvent.location || "",
                price: editingEvent.price || "",
                image_url: editingEvent.image_url || "",
                date: editingEvent.date ? new Date(editingEvent.date).toISOString().slice(0, 16) : "",
              }
            : null
        }
        onClose={() => setEditingEvent(null)}
        onSubmit={(payload) => onUpdate(String(editingEvent!.id), payload)}
      />
    </div>
  );
}
