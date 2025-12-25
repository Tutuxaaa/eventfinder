import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Event, EventCard } from "./EventCard";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Slider } from "./ui/slider";

interface EventFeedProps {
  events: Event[];
  onEventClick: (eventId: string) => void;
  onFavoriteToggle: (eventId: string) => void;
}

export function EventFeed({ events, onEventClick, onFavoriteToggle }: EventFeedProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [dateFilter, setDateFilter] = useState("all");

  const categories = ["Концерты", "Театр", "Выставки", "Спорт", "Комедия", "Кино"];

  const filteredEvents = events.filter((event) => {
    if (selectedCategory && event.category !== selectedCategory) {
      return false;
    }
    return true;
  });

  const clearFilters = () => {
    setSelectedCategory(null);
    setPriceRange([0, 10000]);
    setDateFilter("all");
  };

  const activeFiltersCount = [
    selectedCategory,
    dateFilter !== "all",
    priceRange[0] !== 0 || priceRange[1] !== 10000,
  ].filter(Boolean).length;

  return (
    <div>
      {/* Header */}
      <div className="sticky top-16 z-30 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h2>Все события</h2>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="relative">
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Фильтры
                  {activeFiltersCount > 0 && (
                    <Badge className="ml-2 h-5 w-5 rounded-full p-0 text-xs bg-primary">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Фильтры</SheetTitle>
                </SheetHeader>
                
                <div className="mt-6 space-y-6">
                  <div>
                    <Label>Дата</Label>
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все даты</SelectItem>
                        <SelectItem value="today">Сегодня</SelectItem>
                        <SelectItem value="week">Эта неделя</SelectItem>
                        <SelectItem value="month">Этот месяц</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Диапазон цен: {priceRange[0]}₽ - {priceRange[1]}₽</Label>
                    <Slider
                      value={priceRange}
                      onValueChange={setPriceRange}
                      max={10000}
                      step={100}
                      className="mt-4"
                    />
                  </div>

                  {activeFiltersCount > 0 && (
                    <Button
                      variant="outline"
                      onClick={clearFilters}
                      className="w-full"
                    >
                      Сбросить фильтры
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className={selectedCategory === null ? "bg-primary" : ""}
          >
            Все
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className={selectedCategory === category ? "bg-primary" : ""}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Events Grid */}
      <div className="container mx-auto px-4 py-4">
        <p className="mb-4 text-sm text-muted-foreground">
          Найдено событий: {filteredEvents.length}
        </p>
        
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onCardClick={() => onEventClick(event.id)}
              onFavoriteToggle={() => onFavoriteToggle(event.id)}
            />
          ))}
        </div>

        {filteredEvents.length === 0 && (
          <div className="py-16 text-center">
            <p className="mb-2 text-muted-foreground">
              События не найдены
            </p>
            <Button variant="link" onClick={clearFilters} className="text-primary">
              Сбросить фильтры
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
