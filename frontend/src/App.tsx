import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import { Route, Routes, useNavigate, useParams } from "react-router-dom";
import { AuthDialog } from "./components/AuthDialog";
import { AdminUsers } from "./components/AdminUsers";
import { DiscoverPage } from "./components/DiscoverPage";
import { EventDetail } from "./components/EventDetail";
import { EventFeed } from "./components/EventFeed";
import { EventFilesPanel } from "./components/EventFilesPanel";
import { EventLocationInsights } from "./components/EventLocationInsights";
import { Favorites } from "./components/Favorites";
import { Header } from "./components/Header";
import { HomePage } from "./components/HomePage";
import { ManageEvents } from "./components/ManageEvents";
import { MobileNav } from "./components/MobileNav";
import { NotFoundPage } from "./components/NotFoundPage";
import { Onboarding } from "./components/Onboarding";
import { PhotoSearch } from "./components/PhotoSearch";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PublicEventDetailPage } from "./components/PublicEventDetailPage";
import { Seo } from "./components/Seo";
import { Sidebar } from "./components/Sidebar";
import { eventsApi, mapEventToCard } from "./api";
import type { EventDto, EventFormData } from "./api";
import { useAuth } from "./context/AuthContext";

function EmptyState({ title, description, ctaLabel, onAction }: { title: string; description: string; ctaLabel?: string; onAction?: () => void }) {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="rounded-3xl border bg-card p-10 text-center shadow-sm">
        <h2 className="mb-3">{title}</h2>
        <p className="mx-auto max-w-2xl text-muted-foreground">{description}</p>
        {ctaLabel && onAction && (
          <button onClick={onAction} className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground">
            {ctaLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function canManageEvent(user: { id: number; role: string } | null, event: EventDto | null) {
  if (!user || !event) return false;
  return event.owner_id === user.id || user.role === "manager" || user.role === "admin";
}

function EventDetailRoute({
  seedEvents,
  currentUser,
  onFavoriteToggle,
}: {
  seedEvents: EventDto[];
  currentUser: { id: number; role: string } | null;
  onFavoriteToggle: (eventId: string) => Promise<void>;
}) {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const id = Number(eventId);
      const seeded = seedEvents.find((item) => item.id === id);
      if (seeded) {
        setEvent(seeded);
        setLoading(false);
        return;
      }
      try {
        const fetched = await eventsApi.getById(id);
        if (!ignore) setEvent(fetched);
      } catch {
        if (!ignore) setEvent(null);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [eventId, seedEvents]);

  if (loading) {
    return <EmptyState title="Загрузка события" description="Получаем карточку события и его вложения." />;
  }

  if (!event) {
    return <EmptyState title="Событие не найдено" description="Проверьте ссылку или вернитесь в каталог." ctaLabel="К каталогу" onAction={() => navigate("/events")} />;
  }

  const mapped = mapEventToCard(event);
  const similarEvents = seedEvents
    .filter((item) => item.id !== event.id && item.category === event.category)
    .slice(0, 3)
    .map(mapEventToCard);

  return (
    <>
      <Seo title={`${event.title} — EventFinder`} description={event.description || "Закрытая карточка события"} robots="noindex,nofollow" canonicalPath={`/events/${event.id}`} />
      <EventDetail
        event={mapped}
        similarEvents={similarEvents}
        onBack={() => navigate(-1)}
        onFavoriteToggle={() => void onFavoriteToggle(String(event.id))}
        onSimilarEventClick={(id) => navigate(`/events/${id}`)}
        onSimilarFavoriteToggle={(id) => void onFavoriteToggle(id)}
        filesSlot={<><EventLocationInsights location={event.location} /><EventFilesPanel eventId={event.id} canManage={canManageEvent(currentUser, event)} /></>}
      />
    </>
  );
}

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showPhotoSearch, setShowPhotoSearch] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [events, setEvents] = useState<EventDto[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const { user, logout, loading: authLoading, isAuthenticated, hasRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const hasSeen = localStorage.getItem("hasSeenOnboarding");
    if (hasSeen) setShowOnboarding(false);
  }, []);

  const loadEvents = async () => {
    if (!user) {
      setEvents([]);
      return;
    }
    setLoadingEvents(true);
    try {
      const response = await eventsApi.getAll({
        page: 1,
        page_size: 50,
        scope: hasRole("manager", "admin") ? "all" : "mine",
      });
      setEvents(response.items);
    } catch (error) {
      console.error("Не удалось загрузить события", error);
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      void loadEvents();
    }
  }, [authLoading, user]);

  const cardEvents = useMemo(() => events.map(mapEventToCard), [events]);
  const favoriteEvents = useMemo(() => cardEvents.filter((event) => event.isFavorite), [cardEvents]);

  const handleCreate = async (payload: EventFormData) => {
    await eventsApi.create(payload);
    await loadEvents();
  };

  const handleUpdate = async (eventId: string, payload: EventFormData) => {
    await eventsApi.update(Number(eventId), payload);
    await loadEvents();
  };

  const handleDelete = async (eventId: string) => {
    await eventsApi.delete(Number(eventId));
    await loadEvents();
  };

  const handleFavoriteToggle = async (eventId: string) => {
    const current = events.find((event) => String(event.id) === eventId);
    if (!current) return;
    await eventsApi.toggleFavorite(current.id, !(current.is_favorite ?? false));
    await loadEvents();
  };

  const handleExternalEvent = async (externalEvent: any) => {
    const payload: EventFormData = {
      title: externalEvent.title || "Новое событие",
      description: externalEvent.description || "Добавлено из поиска по фото",
      date: externalEvent.date || "",
      location: externalEvent.location || "",
      price: externalEvent.price || "Бесплатно",
      category: externalEvent.category || "Событие",
      image_url: externalEvent.image_url || "",
      source_url: externalEvent.source_url || "",
    };

    await eventsApi.create(payload);
    await loadEvents();
    setShowPhotoSearch(false);
    navigate("/dashboard");
  };

  const handlePhotoSearchComplete = (eventId: string) => {
    setShowPhotoSearch(false);
    navigate(`/events/${eventId}`);
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem("hasSeenOnboarding", "true");
    setShowOnboarding(false);
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p>Проверка авторизации...</p>
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onAuthClick={() => setShowAuthDialog(true)} user={user} onLogout={logout} />
      <Sidebar isAuthenticated={isAuthenticated} role={user?.role} />

      <div className="pb-20 lg:pl-64 lg:pb-8">
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                featuredEvents={cardEvents}
                onPhotoSearchClick={() => (user ? setShowPhotoSearch(true) : setShowAuthDialog(true))}
                onDiscoverClick={() => navigate("/discover")}
                onEventClick={(id) => navigate(`/events/${id}`)}
                onFavoriteToggle={(id) => void (user ? handleFavoriteToggle(id) : setShowAuthDialog(true))}
              />
            }
          />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/discover/:eventId" element={<PublicEventDetailPage />} />
          <Route
            path="/events"
            element={
              user ? (
                <>
                  <Seo title="Закрытый каталог — EventFinder" description="Защищённый каталог событий" robots="noindex,nofollow" canonicalPath="/events" />
                  <EventFeed />
                </>
              ) : (
                <EmptyState
                  title="Каталог доступен после входа"
                  description="Для лабораторных по авторизации и защите API каталог подключён к защищённым эндпоинтам. Войдите, чтобы получить события пользователя."
                  ctaLabel="Войти"
                  onAction={() => setShowAuthDialog(true)}
                />
              )
            }
          />
          <Route
            path="/events/:eventId"
            element={
              <ProtectedRoute>
                <EventDetailRoute seedEvents={events} currentUser={user} onFavoriteToggle={handleFavoriteToggle} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/favorites"
            element={
              user ? (
                <>
                  <Seo title="Избранное — EventFinder" description="Избранные события пользователя" robots="noindex,nofollow" canonicalPath="/favorites" />
                  <Favorites
                    favoriteEvents={favoriteEvents}
                    onEventClick={(id) => navigate(`/events/${id}`)}
                    onFavoriteToggle={(id) => void handleFavoriteToggle(id)}
                    onExploreClick={() => navigate("/events")}
                  />
                </>
              ) : (
                <EmptyState
                  title="Избранное недоступно без авторизации"
                  description="Сохранение избранных событий привязано к вашему аккаунту и хранится на защищённом API."
                  ctaLabel="Войти"
                  onAction={() => setShowAuthDialog(true)}
                />
              )
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                {loadingEvents || !user ? (
                  <EmptyState title="Загрузка панели управления" description="Синхронизируем ваш каталог с API." />
                ) : (
                  <>
                    <Seo title="Панель управления — EventFinder" description="Управление событиями" robots="noindex,nofollow" canonicalPath="/dashboard" />
                    <ManageEvents
                      events={events}
                      currentUserId={user.id}
                      currentUserRole={user.role}
                      onCreate={handleCreate}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                    />
                  </>
                )}
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute roles={["admin"]}>
                <div>
                  <Seo title="Управление ролями — EventFinder" description="Административная панель пользователей" robots="noindex,nofollow" canonicalPath="/admin/users" />
                  <AdminUsers />
                </div>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>

      <MobileNav isAuthenticated={isAuthenticated} role={user?.role} />

      <AnimatePresence>
        {showPhotoSearch && user && (
          <PhotoSearch onSearchComplete={handlePhotoSearchComplete} onClose={() => setShowPhotoSearch(false)} onExternalEvent={handleExternalEvent} />
        )}
      </AnimatePresence>

      <AuthDialog open={showAuthDialog} onClose={() => setShowAuthDialog(false)} />
    </div>
  );
}
