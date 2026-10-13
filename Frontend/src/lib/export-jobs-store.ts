import { useSyncExternalStore } from "react";

export type ExportFormat = "pdf" | "csv" | "print";
export type ExportStatus = "queued" | "running" | "done" | "failed";
export type ExportJob = {
  id: string;
  name: string;
  format: ExportFormat;
  status: ExportStatus;
  progress: number;
  at: number;
  error?: string;
};

let state: ExportJob[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function update(id: string, patch: Partial<ExportJob>) {
  state = state.map((j) => (j.id === id ? { ...j, ...patch } : j));
  emit();
}

export function useExportJobs() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

export function removeJob(id: string) {
  state = state.filter((j) => j.id !== id);
  emit();
}

export function runExport(
  name: string,
  format: ExportFormat,
  finalize: () => void,
  opts?: { failRate?: number },
): string {
  const id = Math.random().toString(36).slice(2);
  const job: ExportJob = { id, name, format, status: "running", progress: 0, at: Date.now() };
  state = [job, ...state].slice(0, 20);
  emit();

  const failRate = opts?.failRate ?? 0.12;
  const willFail = Math.random() < failRate;
  let p = 0;
  const timer = setInterval(() => {
    p += 12 + Math.random() * 18;
    if (p >= 100) {
      clearInterval(timer);
      if (willFail) {
        update(id, { status: "failed", progress: 90, error: "Network hiccup — retry available" });
      } else {
        update(id, { status: "done", progress: 100 });
        try {
          finalize();
        } catch (e) {
          update(id, { status: "failed", error: e instanceof Error ? e.message : "Export failed" });
        }
      }
    } else {
      update(id, { progress: Math.min(95, p) });
    }
  }, 220);

  return id;
}

export function retryJob(id: string, finalize: () => void) {
  const job = state.find((j) => j.id === id);
  if (!job) return;
  update(id, { status: "running", progress: 0, error: undefined });
  let p = 0;
  const timer = setInterval(() => {
    p += 18 + Math.random() * 20;
    if (p >= 100) {
      clearInterval(timer);
      update(id, { status: "done", progress: 100 });
      try {
        finalize();
      } catch (e) {
        update(id, { status: "failed", error: e instanceof Error ? e.message : "Export failed" });
      }
    } else {
      update(id, { progress: Math.min(95, p) });
    }
  }, 180);
}