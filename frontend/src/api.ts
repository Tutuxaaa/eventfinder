// frontend/src/api.ts
import { useState } from "react";

// Типы
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

interface SearchResult {
  id: number;
  title: string;
  image_url?: string;
  distance: number;
  similarity: number;
}

// Результат парсинга/lookup по фото
export interface ParseLookupResult {
  action: "matched" | "created" | "found_external";
  event_id: number;
  event: Event;
  source_url?: string | null;
}

// API Error Response
export interface ApiError {
  detail: string;
  error?: string;
  message?: string;
}

// Базовый URL - убедитесь, что он правильный
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Обертка для обработки ошибок
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorData: ApiError = await response.json();
      errorMessage = errorData.detail || errorData.error || errorData.message || errorMessage;
    } catch {
      // Если не удалось распарсить JSON
    }
    throw new Error(errorMessage);
  }

  // Для 204 No Content
  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

// Базовый запрос
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  console.log(`Making request to: ${url}`); // Для отладки

  const defaultHeaders: Record<string, string> = {};

  // не ставим Content-Type если body — FormData
  if (!(options.body instanceof FormData)) {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  // Добавляем авторизацию если есть
  const token = localStorage.getItem('token');
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  };

  try {
    const response = await fetch(url, config);
    console.log(`Response status: ${response.status}`); // Для отладки
    return await handleResponse<T>(response);
  } catch (error) {
    console.error(`Request failed to ${url}:`, error);
    if (error instanceof Error) {
      throw new Error(`Network error: ${error.message}`);
    }
    throw error;
  }
}

// CRUD для событий
export const eventsApi = {
  // Получить все события
  getAll: async (): Promise<Event[]> => {
    return apiRequest<Event[]>('/api/v1/events');
  },

  // Получить одно событие
  getById: async (id: number): Promise<Event> => {
    return apiRequest<Event>(`/api/v1/events/${id}`);
  },

  // Создать событие
  create: async (eventData: Partial<Event>): Promise<Event> => {
    return apiRequest<Event>('/api/v1/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  },

  // Обновить событие
  update: async (id: number, eventData: Partial<Event>): Promise<Event> => {
    return apiRequest<Event>(`/api/v1/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(eventData),
    });
  },

  // Удалить событие
  delete: async (id: number): Promise<void> => {
    await apiRequest<void>(`/api/v1/events/${id}`, {
      method: 'DELETE',
    });
  },

  // НОВЫЙ: парсинг и lookup - используем правильный путь /api/v1/photo/lookup
  searchByPhotoLookup: async (file: File): Promise<ParseLookupResult> => {
    const formData = new FormData();
    formData.append('file', file);

    // Правильный путь с префиксом /api/v1
    const result = await apiRequest<ParseLookupResult>('/api/v1/photo/lookup', {
      method: 'POST',
      body: formData,
    });
    return result;
  },
  // Поиск по тексту
  search: async (query: string): Promise<Event[]> => {
    return apiRequest<Event[]>(`/api/v1/events/search?q=${encodeURIComponent(query)}`);
  },

  // Добавить в избранное (если есть такой endpoint)
  toggleFavorite: async (id: number, isFavorite: boolean): Promise<Event> => {
    return apiRequest<Event>(`/api/v1/events/${id}/favorite`, {
      method: 'PATCH',
      body: JSON.stringify({ is_favorite: isFavorite }),
    });
  },

  // Получить избранные события (если есть такой endpoint)
  getFavorites: async (): Promise<Event[]> => {
    return apiRequest<Event[]>('/api/v1/events/favorites');
  },
};

// Пример хука для React
export function useEventsApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callApi = async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await fn();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('API error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const resetError = () => setError(null);

  return {
    loading,
    error,
    callApi,
    resetError,
  };
}

// Хук для работы с событиями
export function useEvents() {
  const { loading, error, callApi } = useEventsApi();

  const getAllEvents = async () => {
    return await callApi(() => eventsApi.getAll());
  };

  const getEvent = async (id: number) => {
    return await callApi(() => eventsApi.getById(id));
  };

  const createEvent = async (eventData: Partial<Event>) => {
    return await callApi(() => eventsApi.create(eventData));
  };

  const updateEvent = async (id: number, eventData: Partial<Event>) => {
    return await callApi(() => eventsApi.update(id, eventData));
  };

  const deleteEvent = async (id: number) => {
    return await callApi(() => eventsApi.delete(id));
  };

  const searchEvents = async (query: string) => {
    return await callApi(() => eventsApi.search(query));
  };

  const uploadPhoto = async (file: File) => {
    return await callApi(() => eventsApi.searchByPhotoLookup(file));
  };

  const toggleFavorite = async (id: number, isFavorite: boolean) => {
    return await callApi(() => eventsApi.toggleFavorite(id, isFavorite));
  };

  const getFavorites = async () => {
    return await callApi(() => eventsApi.getFavorites());
  };

  return {
    loading,
    error,
    getAllEvents,
    getEvent,
    createEvent,
    updateEvent,
    deleteEvent,
    searchEvents,
    uploadPhoto,
    toggleFavorite,
    getFavorites,
  };
}

// Экспорт по умолчанию для удобства
export default eventsApi;