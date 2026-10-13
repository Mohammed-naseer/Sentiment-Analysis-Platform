/**
 * Central API client for communicating with the Express backend.
 * Automatically injects the JWT auth token from localStorage.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5001";

function getToken(): string | null {
  // Guard: localStorage is not available during SSR
  if (typeof window === 'undefined') return null;
  return localStorage.getItem("ai_sentiment_token");
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({ success: false, message: "Invalid server response" }));

  if (!res.ok) {
    // 401 → force logout
    if (res.status === 401) {
      localStorage.removeItem("ai_sentiment_token");
      localStorage.removeItem("ai_sentiment_user");
      window.location.href = "/login";
    }
    const errMsg = json?.error 
      ? `${json.message} ${json.error}` 
      : (json?.message ?? `HTTP ${res.status}`);
    throw new Error(errMsg);
  }

  return json as T;
}

async function uploadRequest<T>(path: string, formData: FormData): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });

  const json = await res.json().catch(() => ({ success: false, message: "Invalid server response" }));

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem("ai_sentiment_token");
      localStorage.removeItem("ai_sentiment_user");
      window.location.href = "/login";
    }
    const errMsg = json?.error 
      ? `${json.message} ${json.error}` 
      : (json?.message ?? `HTTP ${res.status}`);
    throw new Error(errMsg);
  }

  return json as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
  upload: <T>(path: string, formData: FormData) => uploadRequest<T>(path, formData),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};
