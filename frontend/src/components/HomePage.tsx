import { Camera, TrendingUp, MapPin, Calendar } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Event, EventCard } from "./EventCard";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { motion } from "motion/react";
import React from "react";
import { useAuth } from "../context/AuthContext";

interface HomePageProps {
  featuredEvents: Event[];
  onPhotoSearchClick: () => void;
  onEventClick: (eventId: string) => void;
  onFavoriteToggle: (eventId: string) => void;
}

export function HomePage({
  featuredEvents,
  onPhotoSearchClick,
  onEventClick,
  onFavoriteToggle,
}: HomePageProps) {
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
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 px-4 py-12 text-white">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 text-center"
          >
            <h1 className="mb-3 text-white">Найди своё событие</h1>
            <p className="text-lg text-white/90">
              Сфотографируй афишу и узнай все детали
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Button
              size="lg"
              onClick={onPhotoSearchClick}
              className="w-full max-w-md mx-auto flex bg-white text-purple-600 hover:bg-white/90"
            >
              <Camera className="mr-2 h-5 w-5" />
              Найти по фото афиши
            </Button>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4">
        {/* Categories */}
        <section className="py-6">
          <h2 className="mb-4">Категории</h2>
          <div className="grid grid-cols-6 gap-2">
            {categories.map((category, index) => (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="cursor-pointer p-2 text-center transition-all hover:shadow-md hover:border-primary">
                  <p className="text-xs">{category.name}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Dashboard Sections */}
        {/* Popular Events */}
        <section className="py-6">
          <div className="mb-4 flex items-center justify-between">
            <h2>Популярное</h2>
            <Button variant="ghost" className="text-primary text-sm">
              Все
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

        {/* Today Events */}
        <section className="py-6">
          <div className="mb-4 flex items-center justify-between">
            <h2>Сегодня</h2>
            <Button variant="ghost" className="text-primary text-sm">
              Все
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {featuredEvents.slice(2, 6).map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onCardClick={() => onEventClick(event.id)}
                onFavoriteToggle={() => onFavoriteToggle(event.id)}
              />
            ))}
          </div>
        </section>

        {/* Coming Soon Events */}
        <section className="py-6">
          <div className="mb-4 flex items-center justify-between">
            <h2>Скоро</h2>
            <Button variant="ghost" className="text-primary text-sm">
              Все
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

      {/* Floating Action Button */}
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

export default function Header() {
  const { user, loading, logout } = useAuth();

  return (
    <header className="header">
      <div className="logo">EventFinder</div>
      <div style={{ marginLeft: "auto" }}>
        {loading ? (
          <button className="btn">...</button>
        ) : user ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span>{user.name ?? user.email}</span>
            <button className="btn" onClick={logout}>Выйти</button>
          </div>
        ) : (
          <button className="btn" onClick={() => {/* open login dialog */}}>
            Войти
          </button>
        )}
      </div>
    </header>
  );
}
