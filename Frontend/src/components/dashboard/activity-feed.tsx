import { useEffect, useMemo, useState } from "react";
import { Upload, Sparkles, Download, Bell, User, Settings2, ShieldCheck, Activity as ActivityIcon, Search, X } from "lucide-react";
import { useActivity, relativeTime, type ActivityKind } from "@/lib/activity-store";

const iconFor: Record<ActivityKind, typeof Upload> = {
  upload: Upload,
  analysis: Sparkles,
  export: Download,
  alert: Bell,
  user: User,
  system: Settings2,
  admin: ShieldCheck,
};

const colorFor: Record<ActivityKind, string> = {
  upload: "text-accent-cyan bg-accent-cyan/10",
  analysis: "text-brand bg-brand/10",
  export: "text-success bg-success/10",
  alert: "text-danger bg-danger/10",
  user: "text-warning bg-warning/10",
  system: "text-muted-foreground bg-muted",
  admin: "text-brand bg-brand/10",
};

const ALL_KINDS: ActivityKind[] = ["upload", "analysis", "export", "admin", "user", "system", "alert"];

export function ActivityFeed({ limit, searchable = false }: { limit?: number; searchable?: boolean }) {
  const items = useActivity();
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [active, setActive] = useState<Set<ActivityKind>>(new Set(ALL_KINDS));

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((i) => {
      if (!active.has(i.kind)) return false;
      if (!term) return true;
      return [i.title, i.detail, i.kind].filter(Boolean).some((v) => v!.toLowerCase().includes(term));
    });
  }, [items, q, active]);

  const toggleKind = (k: ActivityKind) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  if (loading) {
    return (
      <ol className="space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <li key={i} className="flex gap-3">
            <div className="size-8 rounded-lg bg-muted animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 rounded bg-muted animate-pulse w-3/4" />
              <div className="h-2.5 rounded bg-muted animate-pulse w-1/3" />
            </div>
          </li>
        ))}
      </ol>
    );
  }

  const shown = limit ? filtered.slice(0, limit) : filtered;

  const emptyState = (title: string, desc: string) => (
    <div className="py-10 text-center text-sm text-muted-foreground">
      <ActivityIcon className="size-8 mx-auto mb-2 text-muted-foreground/40" />
      <p className="font-medium text-foreground">{title}</p>
      <p className="text-xs mt-1">{desc}</p>
    </div>
  );

  if (!items.length) {
    return searchable ? (
      <>
        {renderControls(q, setQ, active, toggleKind)}
        {emptyState("No activity yet", "Uploads, analyses, exports, and admin actions will appear here.")}
      </>
    ) : emptyState("No recent activity", "Uploads, analyses, and exports will appear here.");
  }

  if (!shown.length) {
    return (
      <>
        {searchable && renderControls(q, setQ, active, toggleKind)}
        {emptyState("No matching events", "Adjust filters or search terms.")}
      </>
    );
  }

  return (
    <>
    {searchable && renderControls(q, setQ, active, toggleKind)}
    <ol className="relative">
      {shown.map((a, i) => {
        const Icon = iconFor[a.kind];
        return (
          <li key={a.id} className="flex gap-3 pb-4 relative">
            {i < shown.length - 1 && <span className="absolute left-4 top-8 bottom-0 w-px bg-border" />}
            <div className={`size-8 rounded-lg grid place-items-center shrink-0 ${colorFor[a.kind]}`}>
              <Icon className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{a.title}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="capitalize">{a.kind}</span>
                {a.detail && <><span>·</span><span>{a.detail}</span></>}
                <span>·</span>
                <span className="font-mono">{relativeTime(a.at)}</span>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
    </>
  );
}

function renderControls(
  q: string,
  setQ: (v: string) => void,
  active: Set<ActivityKind>,
  toggle: (k: ActivityKind) => void,
) {
  return (
    <div className="space-y-3 mb-4">
      <div className="relative">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search audit log…"
          className="input-field pl-9 pr-9"
        />
        {q && (
          <button
            onClick={() => setQ("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 size-6 grid place-items-center rounded hover:bg-muted"
            aria-label="Clear"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ALL_KINDS.map((k) => {
          const on = active.has(k);
          return (
            <button
              key={k}
              onClick={() => toggle(k)}
              className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-full ring-1 transition-colors ${on ? "ring-brand/40 bg-brand/10 text-brand" : "ring-border text-muted-foreground hover:bg-muted"}`}
            >
              {k}
            </button>
          );
        })}
      </div>
    </div>
  );
}