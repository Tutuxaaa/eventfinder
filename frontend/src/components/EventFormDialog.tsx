import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { EventFormData } from "../api";

interface EventFormDialogProps {
  open: boolean;
  mode: "create" | "edit";
  initialData?: EventFormData | null;
  onClose: () => void;
  onSubmit: (payload: EventFormData) => Promise<void>;
}

const EMPTY_FORM: EventFormData = {
  title: "",
  description: "",
  date: "",
  location: "",
  price: "",
  category: "",
  image_url: "",
};

export function EventFormDialog({ open, mode, initialData, onClose, onSubmit }: EventFormDialogProps) {
  const [form, setForm] = useState<EventFormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initialData ? { ...EMPTY_FORM, ...initialData } : EMPTY_FORM);
    }
  }, [open, initialData]);

  const updateField = (field: keyof EventFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(form);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Новое событие" : "Редактирование события"}</DialogTitle>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="title">Название</Label>
            <Input id="title" value={form.title} onChange={(e) => updateField("title", e.target.value)} required />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Дата и время</Label>
              <Input id="date" type="datetime-local" value={form.date || ""} onChange={(e) => updateField("date", e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Категория</Label>
              <Input id="category" value={form.category || ""} onChange={(e) => updateField("category", e.target.value)} placeholder="Концерт, театр, выставка" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="location">Локация</Label>
              <Input id="location" value={form.location || ""} onChange={(e) => updateField("location", e.target.value)} placeholder="Минск Арена" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Цена</Label>
              <Input id="price" value={form.price || ""} onChange={(e) => updateField("price", e.target.value)} placeholder="от 45 BYN" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_url">URL изображения</Label>
            <Input id="image_url" value={form.image_url || ""} onChange={(e) => updateField("image_url", e.target.value)} placeholder="https://..." />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea id="description" value={form.description || ""} onChange={(e) => updateField("description", e.target.value)} rows={5} placeholder="Краткое описание события" />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Отмена
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Сохраняем..." : mode === "create" ? "Создать" : "Сохранить"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
