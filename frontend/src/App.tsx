import { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { MobileNav } from "./components/MobileNav";
import { Onboarding } from "./components/Onboarding";
import { HomePage } from "./components/HomePage";
import { EventFeed } from "./components/EventFeed";
import { Favorites } from "./components/Favorites";
import { EventDetail } from "./components/EventDetail";
import { PhotoSearch } from "./components/PhotoSearch";
import { AuthDialog } from "./components/AuthDialog";
import { Event } from "./components/EventCard";
import { AnimatePresence } from "motion/react";
import { useAuth } from "./context/AuthContext";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [currentView, setCurrentView] = useState("home");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showPhotoSearch, setShowPhotoSearch] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // Хук ДОЛЖЕН быть вызван ВНУТРИ компонента
  const { user, logout, loading: authLoading } = useAuth();

  // Добавьте для отладки:
  console.log('User object in App:', user);
  console.log('User name:', user?.name);
  console.log('User email:', user?.email);

  // onboarding
  useEffect(() => {
    const hasSeen = localStorage.getItem("hasSeenOnboarding");
    if (hasSeen) setShowOnboarding(false);
    console.log("App - Auth state:", { user, authLoading });
  }, [user, authLoading]);

  // Проверка авторизации
  useEffect(() => {
    if (authLoading) {
      console.log("Auth is loading...");
    } else {
      console.log("Auth loaded. User:", user);
    }
  }, [authLoading, user]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/events/`);
        const data = await res.json();

        // ПРОВЕРКА: Если бэкенд использует пагинацию, данные лежат в data.results
        // Если пагинации нет, данные — это сам data.
        const rawEvents = Array.isArray(data) ? data : (data.results || []);

        if (!Array.isArray(rawEvents)) {
          console.error("Бэкенд вернул странный формат данных:", data);
          return;
        }

        const mapped: Event[] = rawEvents.map((e: any) => {
          const dateObj = new Date(e.date);
          return {
            id: String(e.id),
            title: e.title,
            date: dateObj.toLocaleDateString("ru-RU"),
            time: dateObj.toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            location: e.location ?? "",
            price: e.price ?? "—",
            category: e.category ?? "Другое",
            image: e.image_url || "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4",
            isFavorite: e.is_favorite ?? false,
          };
        });

        setEvents(mapped);
      } catch (err) {
        console.error("Ошибка загрузки событий:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem("hasSeenOnboarding", "true");
    setShowOnboarding(false);
  };

  const handleFavoriteToggle = (eventId: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId ? { ...e, isFavorite: !e.isFavorite } : e
      )
    );
  };

  const handleEventClick = (eventId: string) => {
    setSelectedEventId(eventId);
    setCurrentView("detail");
  };

  const handleNavigate = (view: string) => {
    setCurrentView(view);
    setSelectedEventId(null);
  };

  const handlePhotoSearchComplete = (eventId: string) => {
    setShowPhotoSearch(false);
    handleEventClick(eventId);
  };

  const handleExternalEvent = (externalEvent: any) => {
    // Преобразуем внешнее событие к формату Event
    const newEvent: Event = {
      id: externalEvent.id || String(Date.now()),
      title: externalEvent.title || "Новое событие",
      date: new Date(externalEvent.date || Date.now()).toLocaleDateString("ru-RU"),
      time: new Date(externalEvent.date || Date.now()).toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      location: externalEvent.location || "",
      price: externalEvent.price ?? "—",
      category: externalEvent.category || "Другое",
      image: externalEvent.image_url || "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4",
      isFavorite: false,
    };
    
    setEvents(prev => [...prev, newEvent]);
    handleEventClick(newEvent.id);
  };

  const favoriteEvents = events.filter((e) => e.isFavorite);
  const selectedEvent = events.find((e) => e.id === selectedEventId);

  const similarEvents = selectedEvent
    ? events
        .filter(
          (e) =>
            e.category === selectedEvent.category &&
            e.id !== selectedEvent.id
        )
        .slice(0, 3)
    : [];

  // Пока загружается авторизация
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Проверка авторизации...</p>
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Загрузка событий…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        onAuthClick={() => setShowAuthDialog(true)} 
        user={user} 
        onLogout={logout}
      />

      <Sidebar currentView={currentView} onNavigate={handleNavigate} />

      <div className="lg:pl-64 pb-20 lg:pb-8">
        {currentView === "home" && (
          <HomePage
            featuredEvents={events}
            onPhotoSearchClick={() => setShowPhotoSearch(true)}
            onEventClick={handleEventClick}
            onFavoriteToggle={handleFavoriteToggle}
          />
        )}

        {currentView === "feed" && (
          <EventFeed
            events={events}
            onEventClick={handleEventClick}
            onFavoriteToggle={handleFavoriteToggle}
          />
        )}

        {currentView === "favorites" && (
          <Favorites
            favoriteEvents={favoriteEvents}
            onEventClick={handleEventClick}
            onFavoriteToggle={handleFavoriteToggle}
            onExploreClick={() => handleNavigate("feed")}
          />
        )}

        {currentView === "detail" && selectedEvent && (
          <EventDetail
            event={selectedEvent}
            similarEvents={similarEvents}
            onBack={() => handleNavigate("home")}
            onFavoriteToggle={() =>
              handleFavoriteToggle(selectedEvent.id)
            }
            onSimilarEventClick={handleEventClick}
            onSimilarFavoriteToggle={handleFavoriteToggle}
          />
        )}
      </div>

      <MobileNav currentView={currentView} onNavigate={handleNavigate} />

      <AnimatePresence>
        {showPhotoSearch && (
          <PhotoSearch
            onSearchComplete={handlePhotoSearchComplete}
            onClose={() => setShowPhotoSearch(false)}
            onExternalEvent={handleExternalEvent}
          />
        )}
      </AnimatePresence>

      <AuthDialog
        open={showAuthDialog}
        onClose={() => setShowAuthDialog(false)}
      />
      
      {/* Кнопка для отладки - можно удалить */}
      <button 
        onClick={() => {
          console.log("Current user:", user);
          console.log("Auth loading:", authLoading);
          console.log("LocalStorage token:", localStorage.getItem("access_token"));
        }}
        className="fixed bottom-4 right-4 bg-blue-500 text-white p-2 rounded z-50 text-sm"
      >
        Debug User
      </button>
    </div>
  );
}