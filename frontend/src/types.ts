// frontend/src/types.ts

export interface Event {
  id: number;
  title: string;
  description?: string | null;
  date?: string | null;
  location?: string | null;
  price?: string | null;
  category?: string | null;
  is_favorite?: boolean;
  image_url?: string | null;
  image_hash?: string | null;
  raw_text?: string | null;
  parsed_by_ai?: boolean;
  source_url?: string | null;
  created_at?: string | null;
}

export interface ParseLookupResult {
  action: "matched" | "created" | "found_external";
  event_id: number;
  event: Event;
  source_url?: string | null;
}

export interface ApiError {
  detail: string;
  error?: string;
  message?: string;
}

export interface SearchResult {
  id: number;
  title: string;
  image_url?: string;
  distance: number;
  similarity: number;
}

// Форма для создания/редактирования события
export interface EventFormData {
  title: string;
  description: string;
  date?: string;
  location?: string;
  price?: string;
  category?: string;
  image_url?: string;
}