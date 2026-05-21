import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { mapEventToCard, publicApi } from "../api";
import type { PublicEventDto } from "../types";
import { EventDetail } from "./EventDetail";
import { EventLocationInsights } from "./EventLocationInsights";
import { Seo } from "./Seo";

export function PublicEventDetailPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<PublicEventDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    if (!eventId) return;
    setLoading(true);
    publicApi.getById(Number(eventId)).then((data) => {
      if (!ignore) setEvent(data);
    }).catch(() => {
      if (!ignore) setEvent(null);
    }).finally(() => {
      if (!ignore) setLoading(false);
    });
    return () => { ignore = true; };
  }, [eventId]);

  const mapped = useMemo(() => (event ? mapEventToCard(event) : null), [event]);

  if (loading) return <div className="container mx-auto px-4 py-8">Загрузка публичной страницы события…</div>;
  if (!event || !mapped) return <div className="container mx-auto px-4 py-8">Событие не найдено.</div>;

  return (
    <>
      <Seo
        title={`${event.title} — EventFinder`}
        description={event.description || "Публичная SEO-страница события."}
        canonicalPath={`/discover/${event.id}`}
        image={event.image_url || undefined}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Event",
          name: event.title,
          description: event.description || undefined,
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          eventStatus: "https://schema.org/EventScheduled",
          startDate: event.date || undefined,
          image: event.image_url || undefined,
          location: event.location ? { "@type": "Place", name: event.location } : undefined,
        }}
      />
      <EventDetail
        event={mapped}
        similarEvents={[]}
        onBack={() => navigate("/discover")}
        onFavoriteToggle={() => undefined}
        onSimilarEventClick={() => undefined}
        onSimilarFavoriteToggle={() => undefined}
        filesSlot={<EventLocationInsights location={event.location} />}
      />
    </>
  );
}
