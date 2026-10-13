import { createFileRoute } from "@tanstack/react-router";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, ChevronDown, ChevronUp, RefreshCw, Brain } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/history")({
  component: Page,
});

interface ModelResult {
  sentiment: string;
  confidence: number;
  emotion: string;
  summary: string;
}

interface HistoryItem {
  _id: string;
  text: string;
  finalSentiment: string;
  agreementPercentage: number;
  mostConfidentModel: string;
  gemini: ModelResult;
  groq: ModelResult;
  huggingface: ModelResult;
  createdAt: string;
}

interface ApiResponse { success: boolean; data: HistoryItem[] }

const SENTIMENT_STYLE: Record<string, string> = {
  Positive: "bg-success/10 text-success",
  Negative: "bg-danger/10 text-danger",
  Neutral:  "bg-warning/10 text-warning",
};

function Page() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse>("/api/history");
      if (res.success) setItems(res.data);
    } catch {
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/history/${id}`);
      setItems((prev) => prev.filter((i) => i._id !== id));
      toast.success("Record deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <DashboardTopbar title="Analysis History" />
      <div className="p-6 space-y-6 max-w-[1400px] w-full mx-auto">

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{items.length} past analyses stored in MongoDB</p>
          <button
            onClick={fetchHistory}
            disabled={loading}
            className="ring-1 ring-border px-3 py-1.5 rounded-lg text-xs hover:bg-muted flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {loading && (
          <div className="space-y-3">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="h-16 bg-card ring-1 ring-border rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <Brain className="size-12 text-muted-foreground/40" />
            <div>
              <p className="font-semibold text-muted-foreground">No analyses yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Go to Analysis and run your first multi-model sentiment check.</p>
            </div>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="space-y-3">
            <AnimatePresence>
              {items.map((item, i) => (
                <motion.div
                  key={item._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-xl bg-card ring-1 ring-border overflow-hidden"
                >
                  {/* Row header */}
                  <div className="flex items-center gap-4 p-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate text-foreground font-medium">"{item.text}"</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{fmt(item.createdAt)}</p>
                    </div>
                    <span className={`text-[10px] font-semibold uppercase px-2 py-1 rounded shrink-0 ${SENTIMENT_STYLE[item.finalSentiment] ?? "bg-muted"}`}>
                      {item.finalSentiment}
                    </span>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold text-brand">{item.agreementPercentage}%</div>
                      <div className="text-[10px] text-muted-foreground">agreement</div>
                    </div>
                    <button
                      onClick={() => setExpanded(expanded === item._id ? null : item._id)}
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground shrink-0"
                    >
                      {expanded === item._id ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(item._id)}
                      className="p-1.5 rounded-lg hover:bg-danger/10 text-muted-foreground hover:text-danger shrink-0"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>

                  {/* Expanded model details */}
                  <AnimatePresence>
                    {expanded === item._id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border overflow-hidden"
                      >
                        <div className="p-4 grid gap-3 md:grid-cols-3 bg-muted/30">
                          {(["gemini", "groq", "huggingface"] as const).map((key) => {
                            const m = item[key];
                            const labels: Record<string, string> = { gemini: "✦ Gemini", groq: "⚡ Groq", huggingface: "🤗 HuggingFace" };
                            return (
                              <div key={key} className="p-3 rounded-lg bg-card ring-1 ring-border space-y-1.5">
                                <div className="text-xs font-semibold text-muted-foreground">{labels[key]}</div>
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${SENTIMENT_STYLE[m.sentiment] ?? "bg-muted"}`}>
                                  {m.sentiment}
                                </span>
                                <div className="text-xs text-muted-foreground">{m.confidence}% · {m.emotion}</div>
                                <p className="text-xs text-muted-foreground leading-relaxed">{m.summary}</p>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </>
  );
}
