import { Calendar, MapPin, Heart, DollarSign } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { motion } from "motion/react";

export interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  price: string;
  category: string;
  image: string;
  isFavorite?: boolean;
}

interface EventCardProps {
  event: Event;
  onCardClick: () => void;
  onFavoriteToggle: () => void;
}

export function EventCard({ event, onCardClick, onFavoriteToggle }: EventCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="group cursor-pointer overflow-hidden border-0 shadow-md transition-all hover:shadow-xl">
        <div className="relative aspect-[2/3] overflow-hidden" onClick={onCardClick}>
          <ImageWithFallback
            src={event.image}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          
          <Badge className="absolute left-2 top-2 text-xs bg-black/70 text-white hover:bg-black/80 backdrop-blur-sm border-0">
            {event.category}
          </Badge>
          
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-8 w-8 rounded-full bg-black/70 hover:bg-black/80 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              onFavoriteToggle();
            }}
          >
            <Heart
              className={`h-4 w-4 transition-colors ${
                event.isFavorite ? "fill-red-500 text-red-500" : "text-white"
              }`}
            />
          </Button>
          
          <div className="absolute bottom-0 left-0 right-0 p-2 text-white">
            <h3 className="mb-1 line-clamp-2 text-white text-sm">{event.title}</h3>
            
            <div className="space-y-0.5">
              <div className="flex items-center gap-1 text-xs">
                <Calendar className="h-3 w-3" />
                <span className="line-clamp-1">{event.date}</span>
              </div>
              
              <div className="flex items-center gap-1 text-xs">
                <MapPin className="h-3 w-3" />
                <span className="line-clamp-1">{event.location}</span>
              </div>
              
              <div className="flex items-center gap-1 text-xs">
                <DollarSign className="h-3 w-3" />
                <span>{event.price}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
