import { apiFetch, API_BASE } from "./lib/api";
import { Event as EventCardModel } from "./components/EventCard";
import type {
  EventDto,
  EventFileDto,
  EventFilters,
  EventFormData,
  EventListResponse,
  FileAccessResponse,
  LocationInsightsDto,
  PublicEventDto,
  RoleMatrixResponse,
  TokenPair,
  UserDto,
  UserRole,
} from "./types";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=1200&q=80";

export function mapEventToCard(event: EventDto | PublicEventDto): EventCardModel {
  const parsedDate = event.date ? new Date(event.date) : null;
  const isValidDate = parsedDate && !Number.isNaN(parsedDate.getTime());

  return {
    id: String(event.id),
    title: event.title,
    date: isValidDate ? parsedDate.toLocaleDateString("ru-RU") : "Дата уточняется",
    time: isValidDate
      ? parsedDate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
      : "--:--",
    location: event.location || "Локация уточняется",
    price: event.price || "Бесплатно",
    category: event.category || "Событие",
    image: event.image_url || FALLBACK_IMAGE,
    isFavorite: event.is_favorite ?? false,
    description: event.description || "Описание скоро появится.",
    sourceUrl: event.source_url || undefined,
  };
}

function buildQuery(filters: Record<string, unknown> = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

export const authApi = {
  register: async (payload: { email: string; password: string; name?: string }) =>
    apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }) as Promise<UserDto>,

  login: async (email: string, password: string): Promise<TokenPair> => {
    const params = new URLSearchParams();
    params.append("username", email);
    params.append("password", password);

    const response = await fetch(`${API_BASE}/auth/token`, {
      method: "POST",
      body: params,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Login failed");
      throw new Error(errorText || "Не удалось выполнить вход");
    }
    return response.json();
  },

  me: async () => apiFetch("/auth/me") as Promise<UserDto>,

  logout: async (refreshToken: string) => {
    await apiFetch(
      "/auth/logout",
      {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
      },
      undefined,
      false,
    );
  },
};

export const eventsApi = {
  getAll: async (filters: EventFilters = {}): Promise<EventListResponse> => {
    return apiFetch(`/events/${buildQuery(filters as Record<string, unknown>)}`);
  },

  getFavorites: async (): Promise<EventListResponse> => {
    return apiFetch("/events/favorites");
  },

  getById: async (id: number): Promise<EventDto> => {
    return apiFetch(`/events/${id}`);
  },

  create: async (payload: EventFormData): Promise<EventDto> => {
    return apiFetch("/events/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  update: async (id: number, payload: Partial<EventFormData>): Promise<EventDto> => {
    return apiFetch(`/events/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  delete: async (id: number): Promise<void> => {
    await apiFetch(`/events/${id}`, { method: "DELETE" });
  },

  toggleFavorite: async (id: number, isFavorite: boolean): Promise<EventDto> => {
    return apiFetch(`/events/${id}/favorite`, {
      method: "PATCH",
      body: JSON.stringify({ is_favorite: isFavorite }),
    });
  },

  searchByPhotoLookup: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file);
    return apiFetch("/photo/lookup", {
      method: "POST",
      body: formData,
    });
  },
};

export const publicApi = {
  list: async (filters: Partial<EventFilters> = {}): Promise<EventListResponse<PublicEventDto>> => {
    return apiFetch(`/public/events${buildQuery(filters as Record<string, unknown>)}`);
  },
  getById: async (id: number): Promise<PublicEventDto> => {
    return apiFetch(`/public/events/${id}`);
  },
};

export const externalApi = {
  getLocationInsights: async (location: string): Promise<LocationInsightsDto> => {
    const params = new URLSearchParams({ location });
    return apiFetch(`/external/location-insights?${params.toString()}`);
  },
};

export const filesApi = {
  list: async (eventId: number): Promise<EventFileDto[]> => {
    return apiFetch(`/events/${eventId}/files`);
  },

  upload: async (eventId: number, file: File): Promise<EventFileDto> => {
    const formData = new FormData();
    formData.append("file", file);
    return apiFetch(`/events/${eventId}/files`, { method: "POST", body: formData });
  },

  getAccess: async (fileId: number): Promise<FileAccessResponse> => {
    return apiFetch(`/files/${fileId}/access`);
  },

  delete: async (fileId: number): Promise<void> => {
    await apiFetch(`/files/${fileId}`, { method: "DELETE" });
  },
};

export const usersApi = {
  list: async (): Promise<UserDto[]> => apiFetch("/users"),
  updateRole: async (userId: number, role: UserRole): Promise<UserDto> =>
    apiFetch(`/users/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),
  getRoleMatrix: async (): Promise<RoleMatrixResponse> => apiFetch("/rbac/matrix"),
};

export { EventDto, EventFilters, EventFormData, EventListResponse, EventFileDto, UserDto };

export default {
  ...eventsApi,
  authApi,
  publicApi,
  externalApi,
  filesApi,
  usersApi,
};
