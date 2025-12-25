// frontend/src/lib/api.ts
export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000/api/v1";

let runtimeToken: string | null = null;
export function setRuntimeToken(token: string | null) {
  runtimeToken = token;
  if (token) localStorage.setItem("access_token", token);
  else localStorage.removeItem("access_token");
}
export function getRuntimeToken(): string | null {
  // prefer in-memory token (avoids race with localStorage writes)
  if (runtimeToken) return runtimeToken;
  return localStorage.getItem("access_token");
}

export async function apiFetch(path: string, opts: RequestInit = {}, token?: string | null) {
  const theToken = token ?? getRuntimeToken();
  const headers = new Headers(opts.headers || {});
  // If body is FormData or URLSearchParams, do not set JSON header
  const body = opts.body;
  if (!(body instanceof FormData) && !(body instanceof URLSearchParams)) {
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  }
  if (theToken) headers.set("Authorization", `Bearer ${theToken}`);
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers, credentials: "omit" });

  // global 401 handling: throw so caller can logout
  if (res.status === 401) {
    const errText = await res.text().catch(()=>"Unauthorized");
    const err = new Error("Unauthorized: " + errText);
    // attach status for more context
    (err as any).status = 401;
    throw err;
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.detail || JSON.stringify(data));
      (err as any).status = res.status;
      throw err;
    }
    return data;
  } else {
    if (!res.ok) {
      const txt = await res.text().catch(()=>"Error");
      const err = new Error(txt);
      (err as any).status = res.status;
      throw err;
    }
    return res;
  }
}
