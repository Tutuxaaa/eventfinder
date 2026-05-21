const rawBase = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || "http://localhost:8000";
export const API_BASE = rawBase.endsWith("/api/v1") ? rawBase : `${rawBase.replace(/\/$/, "")}/api/v1`;

let runtimeAccessToken: string | null = null;
let runtimeRefreshToken: string | null = null;

export function setRuntimeTokenPair(accessToken: string | null, refreshToken: string | null) {
  runtimeAccessToken = accessToken;
  runtimeRefreshToken = refreshToken;
  if (accessToken) localStorage.setItem("access_token", accessToken);
  else localStorage.removeItem("access_token");
  if (refreshToken) localStorage.setItem("refresh_token", refreshToken);
  else localStorage.removeItem("refresh_token");
}

export function clearStoredAuth() {
  setRuntimeTokenPair(null, null);
}

export function getAccessToken(): string | null {
  return runtimeAccessToken || localStorage.getItem("access_token");
}

export function getRefreshToken(): string | null {
  return runtimeRefreshToken || localStorage.getItem("refresh_token");
}

export async function refreshSession(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    clearStoredAuth();
    return false;
  }

  const payload = await response.json();
  setRuntimeTokenPair(payload.access_token, payload.refresh_token);
  return true;
}

export async function apiFetch(path: string, opts: RequestInit = {}, token?: string | null, retryOn401 = true) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const theToken = token ?? getAccessToken();
  const headers = new Headers(opts.headers || {});
  const body = opts.body;

  if (!(body instanceof FormData) && !(body instanceof URLSearchParams) && body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (theToken) headers.set("Authorization", `Bearer ${theToken}`);

  const res = await fetch(`${API_BASE}${normalizedPath}`, {
    ...opts,
    headers,
    credentials: "omit",
  });

  if (res.status === 401 && retryOn401 && !normalizedPath.startsWith("/auth/")) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return apiFetch(normalizedPath, opts, undefined, false);
    }
  }

  if (res.status === 204) return null;

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const message = isJson ? payload.detail || JSON.stringify(payload) : payload || `HTTP ${res.status}`;
    const error = new Error(message);
    (error as Error & { status?: number }).status = res.status;
    throw error;
  }

  return payload;
}
