import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { publicApi, mapEventToCard } from "../api";
import type { EventFilters, PublicEventDto } from "../types";
import { EventCard } from "./EventCard";
import { Seo } from "./Seo";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Switch } from "./ui/switch";

const CATEGORY_OPTIONS = ["Концерты", "Театр", "Выставки", "Спорт", "Комедия", "Кино", "Событие"];
const PAGE_SIZE = 12;

type DiscoverDraftFilters = {
  q: string;
  category: string;
  location: string;
  date_from: string;
  date_to: string;
};

function readFilters(params: URLSearchParams): Required<Pick<EventFilters, "q" | "category" | "location" | "sort_by" | "sort_order" | "page" | "page_size">> &
  Pick<EventFilters, "date_from" | "date_to" | "upcoming_only"> {
  const rawPage = Number(params.get("page") || 1);
  const sortBy = params.get("sort_by");
  const sortOrder = params.get("sort_order");

  return {
    q: params.get("q") || "",
    category: params.get("category") || "",
    location: params.get("location") || "",
    date_from: params.get("date_from") || "",
    date_to: params.get("date_to") || "",
    upcoming_only: params.get("upcoming_only") !== "false",
    sort_by: sortBy === "created_at" || sortBy === "title" || sortBy === "date" ? sortBy : "date",
    sort_order: sortOrder === "desc" ? "desc" : "asc",
    page: Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1,
    page_size: PAGE_SIZE,
  };
}

function setOrDelete(params: URLSearchParams, key: string, value: string | boolean | number | undefined) {
  if (value === undefined || value === "" || value === false) params.delete(key);
  else params.set(key, String(value));
}

export function DiscoverPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const filters = useMemo(() => readFilters(params), [params]);
  const [draft, setDraft] = useState<DiscoverDraftFilters>({
    q: filters.q,
    category: filters.category,
    location: filters.location,
    date_from: filters.date_from || "",
    date_to: filters.date_to || "",
  });
  const [items, setItems] = useState<PublicEventDto[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft({
      q: filters.q,
      category: filters.category,
      location: filters.location,
      date_from: filters.date_from || "",
      date_to: filters.date_to || "",
    });
  }, [filters.q, filters.category, filters.location, filters.date_from, filters.date_to]);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(null);

    publicApi
      .list({
        q: filters.q,
        category: filters.category,
        location: filters.location,
        date_from: filters.date_from,
        date_to: filters.date_to,
        page: filters.page,
        page_size: filters.page_size,
        upcoming_only: filters.upcoming_only,
        sort_by: filters.sort_by,
        sort_order: filters.sort_order,
      })
      .then((response) => {
        if (ignore) return;
        setItems(response.items);
        setTotal(response.total);
        setTotalPages(response.total_pages);
      })
      .catch((err: Error) => {
        if (!ignore) setError(err.message || "Не удалось загрузить публичный каталог");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [filters]);

  const cards = useMemo(() => items.map(mapEventToCard), [items]);

  const applyFilters = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const next = new URLSearchParams(params);
    setOrDelete(next, "q", draft.q.trim());
    setOrDelete(next, "category", draft.category.trim());
    setOrDelete(next, "location", draft.location.trim());
    setOrDelete(next, "date_from", draft.date_from);
    setOrDelete(next, "date_to", draft.date_to);
    next.set("page", "1");
    setParams(next, { replace: true });
  };

  const updateParam = (key: string, value: string | boolean | number | undefined) => {
    const next = new URLSearchParams(params);
    setOrDelete(next, key, value);
    if (key !== "page") next.set("page", "1");
    setParams(next, { replace: true });
  };

  const resetFilters = () => {
    setDraft({ q: "", category: "", location: "", date_from: "", date_to: "" });
    setParams(new URLSearchParams(), { replace: true });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Seo
        title="EventFinder — публичный каталог событий"
        description="Публичный каталог мероприятий с SEO-метатегами, canonical, индексируемыми маршрутами и внешними данными по локациям."
        canonicalPath="/discover"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Публичный каталог событий EventFinder",
          description: "Индексируемый каталог мероприятий",
        }}
      />

      <div className="mb-6">
        <h1 className="mb-2">Публичный каталог событий</h1>
        <p className="text-muted-foreground">ЛР3: поиск, минимум 3 фильтра, сортировка, пагинация и сохранение состояния в query params.</p>
      </div>

      <Card className="mb-6 p-4">
        <form className="grid gap-4 lg:grid-cols-6" onSubmit={applyFilters}>
          <div className="lg:col-span-2">
            <Label htmlFor="discover-search">Поиск</Label>
            <Input
              id="discover-search"
              aria-label="Поиск"
              placeholder="Название, описание, локация"
              value={draft.q}
              onChange={(e) => setDraft((current) => ({ ...current, q: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="discover-category">Категория</Label>
            <Select value={draft.category || "all"} onValueChange={(value) => setDraft((current) => ({ ...current, category: value === "all" ? "" : value }))}>
              <SelectTrigger id="discover-category">
                <SelectValue placeholder="Все категории" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все категории</SelectItem>
                {CATEGORY_OPTIONS.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="discover-location">Локация</Label>
            <Input
              id="discover-location"
              aria-label="Локация"
              placeholder="Минск, Vilnius"
              value={draft.location}
              onChange={(e) => setDraft((current) => ({ ...current, location: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="discover-date-from">Дата от</Label>
            <Input
              id="discover-date-from"
              aria-label="Дата от"
              type="date"
              value={draft.date_from}
              onChange={(e) => setDraft((current) => ({ ...current, date_from: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="discover-date-to">Дата до</Label>
            <Input
              id="discover-date-to"
              aria-label="Дата до"
              type="date"
              value={draft.date_to}
              onChange={(e) => setDraft((current) => ({ ...current, date_to: e.target.value }))}
            />
          </div>

          <div className="flex items-end gap-2 lg:col-span-6">
            <Button type="submit">Применить фильтры</Button>
            <Button type="button" variant="outline" onClick={resetFilters}>
              Сбросить фильтры
            </Button>
          </div>
        </form>

        <div className="mt-4 grid gap-4 border-t pt-4 md:grid-cols-3">
          <div>
            <Label>Сортировать по</Label>
            <Select value={filters.sort_by} onValueChange={(value) => updateParam("sort_by", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Дате события</SelectItem>
                <SelectItem value="created_at">Дате создания</SelectItem>
                <SelectItem value="title">Названию</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Порядок</Label>
            <Select value={filters.sort_order} onValueChange={(value) => updateParam("sort_order", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">По возрастанию</SelectItem>
                <SelectItem value="desc">По убыванию</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center gap-2 pt-6 text-sm">
            <Switch checked={filters.upcoming_only !== false} onCheckedChange={(checked) => updateParam("upcoming_only", checked ? undefined : false)} />
            Только будущие события
          </label>
        </div>
      </Card>

      {loading && <Card className="p-10 text-center text-muted-foreground">Загрузка каталога…</Card>}
      {!loading && error && <Card className="p-10 text-center text-destructive">{error}</Card>}
      {!loading && !error && cards.length === 0 && <Card className="p-10 text-center text-muted-foreground">По вашему запросу пока ничего не найдено.</Card>}

      {!loading && !error && cards.length > 0 && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Найдено: {total}. Страница {filters.page} из {totalPages}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {cards.map((event) => (
              <EventCard key={event.id} event={event} onCardClick={() => navigate(`/discover/${event.id}`)} onFavoriteToggle={() => undefined} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <Button variant="outline" disabled={filters.page <= 1} onClick={() => updateParam("page", filters.page - 1)}>
                Назад
              </Button>
              {Array.from({ length: totalPages }, (_, index) => index + 1)
                .slice(0, 7)
                .map((pageNumber) => (
                  <Button key={pageNumber} variant={pageNumber === filters.page ? "default" : "outline"} onClick={() => updateParam("page", pageNumber)}>
                    {pageNumber}
                  </Button>
                ))}
              <Button variant="outline" disabled={filters.page >= totalPages} onClick={() => updateParam("page", filters.page + 1)}>
                Вперёд
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
