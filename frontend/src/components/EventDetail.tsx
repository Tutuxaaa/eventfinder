import { ArrowLeft, Heart, Share2, Calendar, Clock, MapPin, DollarSign, ExternalLink } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Event, EventCard } from "./EventCard";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Separator } from "./ui/separator";
import { motion } from "motion/react";

interface EventDetailProps {
  event: Event;
  similarEvents: Event[];
  onBack: () => void;
  onFavoriteToggle: () => void;
  onSimilarEventClick: (eventId: string) => void;
  onSimilarFavoriteToggle: (eventId: string) => void;
}

export function EventDetail({
  event,
  similarEvents,
  onBack,
  onFavoriteToggle,
  onSimilarEventClick,
  onSimilarFavoriteToggle,
}: EventDetailProps) {
  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex gap-2">
            <Button variant="ghost" size="icon">
              <Share2 className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onFavoriteToggle}
            >
              <Heart
                className={`h-5 w-5 ${
                  event.isFavorite ? "fill-red-500 text-red-500" : ""
                }`}
              />
            </Button>
          </div>
        </div>
      </div>

      {/* Hero Image */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative aspect-[16/9] w-full overflow-hidden"
      >
        <ImageWithFallback
          src={event.image}
          alt={event.title}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <Badge className="mb-3 bg-white/90 text-foreground hover:bg-white">
            {event.category}
          </Badge>
          <h1 className="mb-2 text-white">{event.title}</h1>
        </div>
      </motion.div>

      <div className="container mx-auto px-4 py-8">
        {/* Main Info Card */}
        <Card className="mb-8 p-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="mt-1 h-5 w-5 text-primary" />
              <div>
                <p className="text-muted-foreground text-sm">Дата и время</p>
                <p>{event.date} • {event.time}</p>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-3">
              <MapPin className="mt-1 h-5 w-5 text-primary" />
              <div>
                <p className="text-muted-foreground text-sm">Место проведения</p>
                <p>{event.location}</p>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-3">
              <DollarSign className="mt-1 h-5 w-5 text-primary" />
              <div>
                <p className="text-muted-foreground text-sm">Стоимость билетов</p>
                <p>{event.price}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* CTA Buttons */}
        <div className="mb-8 flex gap-3">
          <Button className="flex-1 bg-primary hover:bg-primary/90">
            <ExternalLink className="mr-2 h-4 w-4" />
            Купить билеты
          </Button>
          <Button
            variant="outline"
            onClick={onFavoriteToggle}
            className={event.isFavorite ? "border-red-500 text-red-500" : ""}
          >
            <Heart
              className={`h-4 w-4 ${event.isFavorite ? "fill-red-500" : ""}`}
            />
          </Button>
        </div>

        {/* Description */}
        <div className="mb-8">
          <h3 className="mb-3">Описание</h3>
          <p className="text-muted-foreground leading-relaxed">
            Присоединяйтесь к нам на незабываемое событие! Это уникальная возможность насладиться 
            великолепным выступлением в одном из лучших мест города. Программа включает в себя 
            выступления известных артистов и множество сюрпризов. Не упустите шанс стать частью 
            этого грандиозного мероприятия!
          </p>
        </div>

        {/* Map Placeholder */}
        <Card className="mb-8 overflow-hidden">
          <div className="aspect-video bg-muted flex items-center justify-center">
            <div className="text-center">
              <MapPin className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">Карта местоположения</p>
            </div>
          </div>
        </Card>

        {/* Similar Events */}
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
