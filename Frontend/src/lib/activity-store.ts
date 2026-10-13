import { useSyncExternalStore } from "react";

export type ActivityKind = "upload" | "analysis" | "export" | "system" | "user" | "alert" | "admin";

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  title: string;
  detail?: string;
  at: number;
};

const seed: ActivityItem[] = [
  { id: "a1", kind: "system", title: "Model retrained on 12,402 new reviews", at: Date.now() - 1000 * 60 * 12 },
  { id: "a2", kind: "export", title: "Sarah Jenkins exported Q4 report", detail: "PDF · 2.4 MB", at: Date.now() - 1000 * 60 * 26 },
  { id: "a3", kind: "alert", title: "Aspect drift detected: Shipping (-6%)", at: Date.now() - 1000 * 60 * 52 },
  { id: "a4", kind: "analysis", title: "Batch analysis completed", detail: "420 reviews · 4.2s", at: Date.now() - 1000 * 60 * 88 },
  { id: "a5", kind: "upload", title: "reviews_q4.csv uploaded", detail: "1,204 rows", at: Date.now() - 1000 * 60 * 132 },
];

let state: ActivityItem[] = seed;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function pushActivity(item: Omit<ActivityItem, "id" | "at"> & Partial<Pick<ActivityItem, "at">>) {
  const next: ActivityItem = {
    id: Math.random().toString(36).slice(2),
    at: Date.now(),
    ...item,
  };
  state = [next, ...state].slice(0, 50);
  emit();
}

export function useActivity() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

export function relativeTime(ts: number) {
  const diff = Math.max(1, Date.now() - ts);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}