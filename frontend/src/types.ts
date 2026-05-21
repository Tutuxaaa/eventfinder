export type UserRole = "user" | "manager" | "admin";

export interface UserDto {
  id: number;
  email: string;
  name?: string | null;
  role: UserRole;
  created_at?: string | null;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface EventFileDto {
  id: number;
  event_id: number;
  original_name: string;
  content_type: string;
  size_bytes: number;
  created_at?: string | null;
}
export interface EventDto {
  id: number;
  title: string;
  description?: string | null;
  date?: string | null;
  location?: string | null;
  price?: string | null;
  category?: string | null;
  is_favorite?: boolean;
  image_url?: string | null;
  source_url?: string | null;
  created_at?: string | null;
  owner_id: number;
  files?: EventFileDto[];
}

export interface PublicEventDto extends EventDto {}

export interface EventFormData {
  title: string;
  description?: string;
  date?: string;
  location?: string;
  price?: string;
  category?: string;
  image_url?: string;
  source_url?: string;
}

export interface EventListResponse<T = EventDto> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface EventFilters {
  q?: string;
  category?: string;
  location?: string;
  date_from?: string;
  date_to?: string;
  favorites_only?: boolean;
  upcoming_only?: boolean;
  sort_by?: "date" | "created_at" | "title";
  sort_order?: "asc" | "desc";
  page?: number;
  page_size?: number;
  scope?: "mine" | "all";
}

export interface FileAccessResponse {
  download_url: string;
  expires_in_seconds: number;
}

export interface RoleMatrixRow {
  role: string;
  allowed_actions: string[];
}

export interface RoleMatrixResponse {
  rows: RoleMatrixRow[];
  notes: string[];
}

export interface LocationInsightDayItem {
  date: string;
  temperature_max?: number | null;
  temperature_min?: number | null;
  weather_code?: number | null;
  summary: string;
}

export interface LocationInsightsResult {
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  country?: string | null;
  admin1?: string | null;
  current_temperature?: number | null;
  current_wind_speed?: number | null;
  daily: LocationInsightDayItem[];
}

export interface LocationInsightsDto {
  location_query: string;
  source: string;
  generated_at: string;
  result?: LocationInsightsResult | null;
}
