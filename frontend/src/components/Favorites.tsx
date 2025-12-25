import { Heart } from "lucide-react";
import { Event, EventCard } from "./EventCard";
import { Button } from "./ui/button";

interface FavoritesProps {
  favoriteEvents: Event[];
  onEventClick: (eventId: string) => void;
  onFavoriteToggle: (eventId: string) => void;
  onExploreClick: () => void;
}

export function Favorites({
  favoriteEvents,
  onEventClick,
  onFavoriteToggle,
  onExploreClick,
}: FavoritesProps) {
  return (
    <div>
      <div className="container mx-auto px-4 py-8">
        <h2 className="mb-6">Избранное</h2>

        {favoriteEvents.length > 0 ? (
          <>
            <p className="mb-6 text-sm text-muted-foreground">
              У вас {favoriteEvents.length} сохраненных {favoriteEvents.length === 1 ? "событие" : "событий"}
            </p>
            
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {favoriteEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onCardClick={() => onEventClick(event.id)}
                  onFavoriteToggle={() => onFavoriteToggle(event.id)}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
              <Heart className="h-12 w-12 text-muted-foreground" />
            </div>
            
            <h3 className="mb-2">Пока нет избранных событий</h3>
            <p className="mb-6 max-w-sm text-muted-foreground">
              Добавляйте события в избранное, чтобы не потерять их и получать уведомления об изменениях
            </p>
            
            <Button onClick={onExploreClick} className="bg-primary hover:bg-primary/90">
              Посмотреть события
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
