import { useSyncExternalStore } from "react";

export type HistoryStatus = "queued" | "running" | "complete" | "failed";
export type HistorySentiment = "positive" | "neutral" | "negative";
export type HistoryRow = {
  text: string;
  sentiment: HistorySentiment;
  confidence: number;
  emotion: string;
  keywords: string;
};
export type HistoryEntry = {
  id: string;
  fileName: string;
  size: number;
  rows: HistoryRow[];
  status: HistoryStatus;
  at: number;
  error?: string;
};

let state: HistoryEntry[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function addHistory(entry: Omit<HistoryEntry, "id" | "at">): string {
  const id = Math.random().toString(36).slice(2);
  state = [{ ...entry, id, at: Date.now() }, ...state].slice(0, 50);
  emit();
  return id;
}

export function updateHistory(id: string, patch: Partial<HistoryEntry>) {
  state = state.map((h) => (h.id === id ? { ...h, ...patch } : h));
  emit();
}

export function removeHistory(id: string) {
  state = state.filter((h) => h.id !== id);
  emit();
}

export function getHistory(id: string): HistoryEntry | undefined {
  return state.find((h) => h.id === id);
}

export function useHistory() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}