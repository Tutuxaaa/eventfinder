import { Camera } from "lucide-react";
import { motion } from "motion/react";
import { Event, EventCard } from "./EventCard";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Seo } from "./Seo";

interface HomePageProps {
  featuredEvents: Event[];
  onPhotoSearchClick: () => void;
  onEventClick: (eventId: string) => void;
  onFavoriteToggle: (eventId: string) => void;
  onDiscoverClick?: () => void;
}

export function HomePage({ featuredEvents, onPhotoSearchClick, onEventClick, onFavoriteToggle, onDiscoverClick }: HomePageProps) {
  const categories = [
    { name: "Концерты" },
    { name: "Театр" },
    { name: "Выставки" },
    { name: "Спорт" },
    { name: "Комедия" },
    { name: "Кино" },
  ];

  return (
    <div className="pb-8">
      <Seo title="EventFinder — поиск событий по афишам" description="MVP для поиска событий, управления каталогом, SEO-страниц и внешних интеграций." canonicalPath="/" />
      <section className="bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 px-4 py-12 text-white">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
            <h1 className="mb-3 text-white">Сервис поиска событий по афишам</h1>
            <p className="text-lg text-white/90">Загрузите фото, найдите событие, сохраните его и управляйте своей коллекцией в одном интерфейсе.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col gap-3 md:flex-row md:justify-center">
            <Button size="lg" onClick={onPhotoSearchClick} className="mx-auto flex w-full max-w-md bg-white text-purple-600 hover:bg-white/90">
              <Camera className="mr-2 h-5 w-5" />
              Найти по фото афиши
            </Button>
            <Button size="lg" variant="secondary" onClick={onDiscoverClick} className="mx-auto flex w-full max-w-md">
              Открыть публичный каталог
            </Button>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4">
        <section className="py-6">
          <h2 className="mb-4">Категории</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((category, index) => (
              <motion.div key={category.name} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.05 }}>
                <Card className="cursor-pointer p-3 text-center transition-all hover:border-primary hover:shadow-md">
                  <p className="text-sm">{category.name}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="py-6">
          <div className="mb-4 flex items-center justify-between">
            <h2>Популярное</h2>
            <Button variant="ghost" className="text-sm text-primary" onClick={onDiscoverClick}>
              Каталог
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {featuredEvents.slice(0, 4).map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onCardClick={() => onEventClick(event.id)}
                onFavoriteToggle={() => onFavoriteToggle(event.id)}
              />
            ))}
          </div>
        </section>

        <section className="py-6">
          <div className="mb-4 flex items-center justify-between">
            <h2>Скоро в городе</h2>
            <Button variant="ghost" className="text-sm text-primary" onClick={onDiscoverClick}>
              Все события
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {featuredEvents.slice(4, 8).map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onCardClick={() => onEventClick(event.id)}
                onFavoriteToggle={() => onFavoriteToggle(event.id)}
              />
            ))}
          </div>
        </section>
      </div>

      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onPhotoSearchClick}
        className="fixed bottom-24 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg transition-shadow hover:shadow-xl lg:bottom-6 lg:h-16 lg:w-16"
      >
        <Camera className="h-6 w-6 lg:h-7 lg:w-7" />
      </motion.button>
    </div>
  );
}
