/**
 * Global authentication state store using useSyncExternalStore.
 * Persists token and user to localStorage so sessions survive refreshes.
 */
import { useSyncExternalStore } from "react";
import { api } from "./api";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
  role: 'Admin' | 'Analyst' | 'Viewer' | 'Reader' | 'Pending';
  status: 'Pending' | 'Approved' | 'Rejected';
  approved: boolean;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

// ── Persistence helpers ──────────────────────────────────────────────────────
function loadState(): AuthState {
  // Guard: localStorage is not available during SSR (TanStack Start / Node.js)
  if (typeof window === 'undefined') {
    return { user: null, token: null, loading: false, error: null };
  }
  try {
    const token = localStorage.getItem("ai_sentiment_token");
    const raw = localStorage.getItem("ai_sentiment_user");
    const user: AuthUser | null = raw ? JSON.parse(raw) : null;
    return { user, token, loading: false, error: null };
  } catch {
    return { user: null, token: null, loading: false, error: null };
  }
}

function saveState(state: AuthState) {
  // Guard: localStorage is not available during SSR
  if (typeof window === 'undefined') return;
  if (state.token && state.user) {
    localStorage.setItem("ai_sentiment_token", state.token);
    localStorage.setItem("ai_sentiment_user", JSON.stringify(state.user));
  } else {
    localStorage.removeItem("ai_sentiment_token");
    localStorage.removeItem("ai_sentiment_user");
  }
}

// ── Store internals ──────────────────────────────────────────────────────────
let state: AuthState = loadState();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function setState(patch: Partial<AuthState>) {
  state = { ...state, ...patch };
  saveState(state);
  emit();
}

// ── API response types ───────────────────────────────────────────────────────
interface AuthResponse {
  success: boolean;
  data: { token: string | null; user: AuthUser };
}

// ── Public actions ───────────────────────────────────────────────────────────

export async function register(name: string, email: string, password: string) {
  setState({ loading: true, error: null });
  try {
    const res = await api.post<AuthResponse>("/api/auth/register", { name, email, password });
    if (!res.data.token) {
      setState({ user: null, token: null, loading: false });
      throw new Error("Registration request submitted successfully! Awaiting administrator approval.");
    }
    setState({ user: res.data.user, token: res.data.token, loading: false });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Registration failed";
    setState({ loading: false, error: msg });
    throw err;
  }
}

export async function login(email: string, password: string) {
  setState({ loading: true, error: null });
  try {
    const res = await api.post<AuthResponse>("/api/auth/login", { email, password });
    setState({ user: res.data.user, token: res.data.token, loading: false });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Login failed";
    setState({ loading: false, error: msg });
    throw err;
  }
}

export async function googleLogin(idToken: string) {
  setState({ loading: true, error: null });
  try {
    const res = await api.post<AuthResponse>("/api/auth/google", { idToken });
    setState({ user: res.data.user, token: res.data.token, loading: false });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Google login failed";
    setState({ loading: false, error: msg });
    throw err;
  }
}

export async function logout() {
  try { await api.post("/api/auth/logout", {}); } catch { /* ignore */ }
  setState({ user: null, token: null, loading: false, error: null });
}

export function updateAuthUser(patch: Partial<AuthUser>) {
  if (!state.user) return;
  setState({ user: { ...state.user, ...patch } });
}

// ── React hook ───────────────────────────────────────────────────────────────
export function useAuth() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => state,
    () => state,
  );
}
