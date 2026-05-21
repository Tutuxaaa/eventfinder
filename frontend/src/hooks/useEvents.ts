// frontend/src/hooks/useEvents.ts
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { EventDto, EventListResponse } from "../types";

export function useEvents() {
  const [items, setItems] = useState<EventDto[]>([]);
  const { user, loading } = useAuth();

  useEffect(() => {
    let mounted = true;
    if (loading) return; // wait until auth finished
    if (!user) {
      setItems([]); // not logged in => empty
      return;
    }
    apiFetch("/events/")
      .then((data: EventListResponse) => { if (mounted) setItems(data.items); })
      .catch((err) => {
        console.error(err);
        // if 401, logout will be handled in global caller; optionally clear items
        if (mounted) setItems([]);
      });
    return () => { mounted = false; }
  }, [user, loading]);

  return { items, setItems };
}
