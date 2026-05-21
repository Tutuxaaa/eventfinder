import { useEffect, useMemo, useState } from "react";
import { Filter, Search } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { eventsApi, mapEventToCard } from "../api";
import { useAuth } from "../context/AuthContext";
import { EventListResponse } from "../types";
import { EventCard } from "./EventCard";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Switch } from "./ui/switch";

const CATEGORY_OPTIONS = ["Концерты", "Театр", "Выставки", "Спорт", "Комедия", "Кино", "Событие"];

export function EventFeed() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const [payload, setPayload] = useState<EventListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const filters = useMemo(
    () => ({
      q: searchParams.get("q") || "",
      category: searchParams.get("category") || "",
      location: searchParams.get("location") || "",
      favorites_only: searchParams.get("favorites_only") === "true",
      upcoming_only: searchParams.get("upcoming_only") === "true",
      sort_by: (searchParams.get("sort_by") || "date") as "date" | "created_at" | "title",
      sort_order: (searchParams.get("sort_order") || "asc") as "asc" | "desc",
      page: Number(searchParams.get("page") || 1),
      page_size: Number(searchParams.get("page_size") || 9),
      scope: (searchParams.get("scope") || "mine") as "mine" | "all",
    }),
    [searchParams],
  );

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const response = await eventsApi.getAll(filters);
        if (!ignore) setPayload(response);
      } catch (err: any) {
        if (!ignore) setError(err.message || "Не удалось загрузить каталог");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [filters]);

  const cardEvents = useMemo(() => (payload?.items || []).map(mapEventToCard), [payload]);

  const updateParam = (key: string, value: string | boolean | number | null) => {
    const next = new URLSearchParams(searchParams);
    if (value === null || value === "" || value === false) next.delete(key);
    else next.set(key, String(value));
    if (key !== "page") next.set("page", "1");
    setSearchParams(next, { replace: true });
  };

  const canViewAll = hasRole("manager", "admin");
  const activeFilters = [filters.q, filters.category, filters.location, filters.favorites_only, filters.upcoming_only].filter(Boolean).length;

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="mb-1">Каталог событий</h2>
          <p className="text-muted-foreground">
            ЛР3: серверная фильтрация, поиск, сортировка и пагинация с сохранением состояния в query params.
          </p>
        </div>
        {canViewAll && (
          <div className="flex items-center gap-3 rounded-2xl border px-4 py-3">
            <span className="text-sm text-muted-foreground">Область просмотра</span>
            <Select value={filters.scope} onValueChange={(value) => updateParam("scope", value)}>
              <SelectTrigger className="w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mine">Мои события</SelectItem>
                <SelectItem value="all">Весь каталог</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Card className="p-5">
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Label htmlFor="catalog-search">Поиск</Label>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="catalog-search"
                className="pl-9"
                value={filters.q}
                placeholder="Название, описание, локация"
                onChange={(e) => updateParam("q", e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Категория</Label>
            <Select value={filters.category || "all"} onValueChange={(value) => updateParam("category", value === "all" ? null : value)}>
              <SelectTrigger className="mt-2">
                <SelectValue />
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
            <Label htmlFor="catalog-location">Локация</Label>
            <Input
              id="catalog-location"
              className="mt-2"
              value={filters.location}
              placeholder="Минск, Arena, Gallery"
              onChange={(e) => updateParam("location", e.target.value)}
            />
          </div>

          <div>
            <Label>Сортировка</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Select value={filters.sort_by} onValueChange={(value) => updateParam("sort_by", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">По дате</SelectItem>
                  <SelectItem value="created_at">По созданию</SelectItem>
                  <SelectItem value="title">По названию</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.sort_order} onValueChange={(value) => updateParam("sort_order", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">По возр.</SelectItem>
                  <SelectItem value="desc">По убыв.</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-4 border-t pt-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={filters.upcoming_only} onCheckedChange={(checked) => updateParam("upcoming_only", checked)} />
              Только будущие
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={filters.favorites_only} onCheckedChange={(checked) => updateParam("favorites_only", checked)} />
              Только избранное
            </label>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              Активных фильтров: <Badge variant="secondary">{activeFilters}</Badge>
            </div>
          </div>
          <Button variant="outline" onClick={() => setSearchParams(new URLSearchParams(), { replace: true })}>
            Сбросить фильтры
          </Button>
        </div>
      </Card>

      {loading ? (
        <Card className="p-10 text-center text-muted-foreground">Загрузка каталога...</Card>
      ) : error ? (
        <Card className="p-10 text-center text-destructive">{error}</Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Найдено: {payload?.total ?? 0}. Страница {payload?.page ?? 1} из {payload?.total_pages ?? 1}
            </p>
            {user && <p className="text-sm text-muted-foreground">Роль: {user.role}</p>}
          </div>

          {cardEvents.length === 0 ? (
            <Card className="p-10 text-center text-muted-foreground">По выбранным параметрам событий не найдено.</Card>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {cardEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onCardClick={() => navigate(`/events/${event.id}`)}
                  onFavoriteToggle={() => {
                    const current = payload?.items.find((item) => item.id === Number(event.id));
                    if (!current) return;
                    void eventsApi.toggleFavorite(current.id, !(current.is_favorite ?? false)).then(() => {
                      void eventsApi.getAll(filters).then(setPayload);
                    });
                  }}
                />
              ))}
            </div>
          )}

          {(payload?.total_pages ?? 1) > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button variant="outline" disabled={(payload?.page ?? 1) <= 1} onClick={() => updateParam("page", (payload?.page ?? 1) - 1)}>
                Назад
              </Button>
              {Array.from({ length: payload?.total_pages ?? 1 }, (_, index) => index + 1)
                .slice(0, 7)
                .map((pageNumber) => (
                  <Button
                    key={pageNumber}
                    variant={pageNumber === payload?.page ? "default" : "outline"}
                    onClick={() => updateParam("page", pageNumber)}
                  >
                    {pageNumber}
                  </Button>
                ))}
              <Button
                variant="outline"
                disabled={(payload?.page ?? 1) >= (payload?.total_pages ?? 1)}
                onClick={() => updateParam("page", (payload?.page ?? 1) + 1)}
              >
                Вперёд
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
