import { ArrowLeft, Calendar, DollarSign, ExternalLink, Heart, MapPin, Share2 } from "lucide-react";
import { motion } from "motion/react";
import { ReactNode } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Event, EventCard } from "./EventCard";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Separator } from "./ui/separator";

interface EventDetailProps {
  event: Event;
  similarEvents: Event[];
  onBack: () => void;
  onFavoriteToggle: () => void;
  onSimilarEventClick: (eventId: string) => void;
  onSimilarFavoriteToggle: (eventId: string) => void;
  filesSlot?: ReactNode;
}

export function EventDetail({
  event,
  similarEvents,
  onBack,
  onFavoriteToggle,
  onSimilarEventClick,
  onSimilarFavoriteToggle,
  filesSlot,
}: EventDetailProps) {
  const shareEvent = async () => {
    if (navigator.share) {
      await navigator.share({ title: event.title, text: event.description, url: window.location.href }).catch(() => {});
    }
  };

  return (
    <div className="pb-24">
      <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={shareEvent}>
              <Share2 className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onFavoriteToggle}>
              <Heart className={`h-5 w-5 ${event.isFavorite ? "fill-red-500 text-red-500" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative aspect-[16/9] w-full overflow-hidden">
        <ImageWithFallback src={event.image} alt={event.title} className="h-full w-full object-cover" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <Badge className="mb-3 bg-white/90 text-foreground hover:bg-white">{event.category}</Badge>
          <h1 className="mb-2 text-white">{event.title}</h1>
        </div>
      </motion.div>

      <div className="container mx-auto px-4 py-8">
        <Card className="mb-8 p-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="mt-1 h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Дата и время</p>
                <p>
                  {event.date} • {event.time}
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-3">
              <MapPin className="mt-1 h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Место проведения</p>
                <p>{event.location}</p>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-3">
              <DollarSign className="mt-1 h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Стоимость билетов</p>
                <p>{event.price}</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="mb-8 flex gap-3">
          {event.sourceUrl ? (
            <Button asChild className="flex-1 bg-primary hover:bg-primary/90">
              <a href={event.sourceUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Открыть источник
              </a>
            </Button>
          ) : (
            <Button className="flex-1 bg-primary hover:bg-primary/90" disabled>
              <ExternalLink className="mr-2 h-4 w-4" />
              Ссылка появится позже
            </Button>
          )}
          <Button variant="outline" onClick={onFavoriteToggle} className={event.isFavorite ? "border-red-500 text-red-500" : ""}>
            <Heart className={`h-4 w-4 ${event.isFavorite ? "fill-red-500" : ""}`} />
          </Button>
        </div>

        <div className="mb-8">
          <h3 className="mb-3">Описание</h3>
          <p className="leading-relaxed text-muted-foreground">{event.description || "Описание скоро появится."}</p>
        </div>

        {filesSlot && <div className="mb-8">{filesSlot}</div>}

        <Card className="mb-8 overflow-hidden">
          <div className="flex aspect-video items-center justify-center bg-muted">
            <div className="text-center">
              <MapPin className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">Здесь оставлен нейтральный блок: карту можно подключить следующим этапом, а сейчас рядом уже встроен внешний API по локации.</p>
            </div>
          </div>
        </Card>

        {similarEvents.length > 0 && (
          <div>
            <h3 className="mb-4">Похожие события</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {similarEvents.map((similarEvent) => (
                <EventCard
                  key={similarEvent.id}
                  event={similarEvent}
                  onCardClick={() => onSimilarEventClick(similarEvent.id)}
                  onFavoriteToggle={() => onSimilarFavoriteToggle(similarEvent.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
