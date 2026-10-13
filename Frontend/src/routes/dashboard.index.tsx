import { createFileRoute } from "@tanstack/react-router";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { AreaChart, Area, ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, RefreshCw, Camera, Eye } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export const Route = createFileRoute("/dashboard/")({
  component: Page,
});

interface DashboardSummary {
  totalAnalyses: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  averageConfidence: number;
  averageAgreement: number;
  mostUsedModel: string;
}

interface WeeklyPoint { date: string; total: number; positive: number; negative: number; neutral: number }

interface DashboardData {
  summary: DashboardSummary;
  weeklyStatistics: WeeklyPoint[];
  monthlyStatistics: WeeklyPoint[];
  agreementDistribution: { level: string; count: number }[];
  providerMetrics: { provider: string; avgConfidence: number }[];
}

interface VisionStatsData {
  totalVisualAnalyses: number;
  duplicateImageCount: number;
  uniqueImageCount: number;
  breakdown: Array<{ label: string; count: number; percentage: number }>;
}

interface ApiResponse { success: boolean; data: DashboardData }
interface ApiVisionResponse { success: boolean; data: VisionStatsData }

const DIST_COLORS = ["#22c55e", "#94a3b8", "#ef4444"];
const VISION_COLORS = ["#06b6d4", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#3b82f6", "#64748b", "#10b981"];

function SkeletonCard() {
  return (
    <div className="p-4 rounded-xl bg-card ring-1 ring-border animate-pulse space-y-2">
      <div className="h-3 bg-muted rounded w-1/2" />
      <div className="h-7 bg-muted rounded w-3/4" />
      <div className="h-3 bg-muted rounded w-1/3" />
    </div>
  );
}

function Page() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [visionStats, setVisionStats] = useState<VisionStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const [res, vRes] = await Promise.all([
        api.get<ApiResponse>("/api/dashboard"),
        api.get<ApiVisionResponse>("/api/vision/stats").catch(() => null),
      ]);
      if (res.success) setData(res.data);
      if (vRes && vRes.success) setVisionStats(vRes.data);
    } catch {
      // Keep existing data or null — UI shows empty state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  const s = data?.summary;
  const totalRate = s ? ((s.positiveCount / Math.max(s.totalAnalyses, 1)) * 100).toFixed(1) : "0";

  const kpis = s ? [
    { label: "Total Analyses",    value: s.totalAnalyses.toLocaleString(),          delta: "All time",      trend: "up" as const },
    { label: "Positive",          value: s.positiveCount.toLocaleString(),           delta: `${totalRate}% rate`, trend: "up" as const },
    { label: "Negative",          value: s.negativeCount.toLocaleString(),           delta: "flagged",       trend: "down" as const },
    { label: "Neutral",           value: s.neutralCount.toLocaleString(),            delta: "inconclusive",  trend: "up" as const },
    { label: "Avg. Confidence",   value: `${s.averageConfidence.toFixed(1)}%`,       delta: "AI confidence", trend: "up" as const },
    { label: "Model Agreement",   value: `${s.averageAgreement.toFixed(1)}%`,        delta: s.mostUsedModel, trend: "up" as const },
  ] : [];

  const weekly = data?.weeklyStatistics ?? [];
  const distData = s
    ? [
        { name: "Positive", value: s.positiveCount, color: DIST_COLORS[0] },
        { name: "Neutral",  value: s.neutralCount,  color: DIST_COLORS[1] },
        { name: "Negative", value: s.negativeCount, color: DIST_COLORS[2] },
      ]
    : [];
  const providerData = data?.providerMetrics ?? [];

  return (
    <>
      <DashboardTopbar title="Overview" />
      <div className="p-6 space-y-6 max-w-[1600px] w-full mx-auto">

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Live data from MongoDB Atlas</p>
          <button onClick={fetchDashboard} disabled={loading} className="ring-1 ring-border px-3 py-1.5 rounded-lg text-xs hover:bg-muted flex items-center gap-1.5 disabled:opacity-50">
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {/* KPI strip */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          {loading
            ? Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)
            : kpis.map((k, i) => (
                <motion.div
                  key={k.label}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="p-4 rounded-xl bg-card ring-1 ring-border"
                >
                  <div className="text-xs text-muted-foreground">{k.label}</div>
                  <div className="text-2xl font-semibold mt-1 tracking-tight">{k.value}</div>
                  <div className={`text-[11px] mt-1 flex items-center gap-1 ${k.trend === "up" ? "text-success" : "text-danger"}`}>
                    {k.trend === "up" ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                    {k.delta}
                  </div>
                </motion.div>
              ))
          }
        </div>

        {/* Charts row */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 p-6 rounded-xl bg-card ring-1 ring-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold tracking-tight">Weekly sentiment trend</h3>
                <p className="text-xs text-muted-foreground">Last 7 days</p>
              </div>
              <div className="flex gap-3 text-xs">
                {[["#4f46e5", "Positive"], ["#06b6d4", "Neutral"], ["#ef4444", "Negative"]].map(([color, label]) => (
                  <span key={label} className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="size-2 rounded-full" style={{ background: color }} />{label}
                  </span>
                ))}
              </div>
            </div>
            <div className="h-72">
              {loading
                ? <div className="h-full bg-muted animate-pulse rounded-xl" />
                : weekly.length > 0
                  ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={weekly}>
                          <defs>
                            <linearGradient id="p" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4f46e5" stopOpacity={0.4} /><stop offset="100%" stopColor="#4f46e5" stopOpacity={0} /></linearGradient>
                            <linearGradient id="n" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} /><stop offset="100%" stopColor="#06b6d4" stopOpacity={0} /></linearGradient>
                            <linearGradient id="ng" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} /><stop offset="100%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                          <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis fontSize={11} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--color-border)" }} />
                          <Area dataKey="positive" stroke="#4f46e5" fill="url(#p)" strokeWidth={2} />
                          <Area dataKey="neutral"  stroke="#06b6d4" fill="url(#n)" strokeWidth={2} />
                          <Area dataKey="negative" stroke="#ef4444" fill="url(#ng)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )
                  : (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                        No data yet — run your first analysis!
                      </div>
                    )
              }
            </div>
          </div>

          <div className="p-6 rounded-xl bg-card ring-1 ring-border">
            <h3 className="font-semibold tracking-tight mb-1">Sentiment distribution</h3>
            <p className="text-xs text-muted-foreground mb-4">All-time breakdown</p>
            <div className="h-52">
              {loading
                ? <div className="h-full bg-muted animate-pulse rounded-xl" />
                : distData.every((d) => d.value === 0)
                  ? <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
                  : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={distData} dataKey="value" innerRadius={55} outerRadius={80} paddingAngle={3}>
                            {distData.map((e) => <Cell key={e.name} fill={e.color} />)}
                          </Pie>
                          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )
              }
            </div>
            <div className="space-y-2 text-xs mt-2">
              {distData.map((s) => (
                <div key={s.name} className="flex justify-between items-center">
                  <span className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: s.color }} />{s.name}</span>
                  <span className="font-mono">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Provider metrics + activity */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 p-6 rounded-xl bg-card ring-1 ring-border">
            <h3 className="font-semibold tracking-tight mb-4">AI Provider confidence</h3>
            <div className="h-64">
              {loading
                ? <div className="h-full bg-muted animate-pulse rounded-xl" />
                : providerData.length > 0
                  ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={providerData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                          <XAxis dataKey="provider" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                          <Bar dataKey="avgConfidence" name="Avg Confidence %" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )
                  : (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                        Run analyses to see provider metrics
                      </div>
                    )
              }
            </div>
          </div>
          <div className="p-6 rounded-xl bg-card ring-1 ring-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold tracking-tight">Activity timeline</h3>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Live</span>
            </div>
            {loading
              ? <div className="space-y-2">{Array(4).fill(0).map((_, i) => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}</div>
              : <ActivityFeed limit={8} />
            }
          </div>
        </div>

        {/* ── Visual Customer Intelligence Module ────────────────────────── */}
        <div className="p-6 rounded-xl bg-card ring-1 ring-border space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Camera className="size-5 text-accent-cyan" />
              <h3 className="font-semibold tracking-tight">Visual Customer Intelligence</h3>
              <span className="text-[10px] uppercase tracking-widest bg-accent-cyan/10 text-accent-cyan px-2 py-0.5 rounded-full font-semibold">
                Computer Vision
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Product defect & packaging condition diagnostics
            </p>
          </div>

          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <div className="p-4 rounded-xl bg-muted/40 border border-border/80">
              <span className="text-xs text-muted-foreground">Images Analyzed</span>
              <p className="text-2xl font-semibold mt-1 tabular-nums">
                {visionStats?.totalVisualAnalyses ?? 0}
              </p>
              <span className="text-[11px] text-muted-foreground">Total submissions</span>
            </div>
            <div className="p-4 rounded-xl bg-muted/40 border border-border/80">
              <span className="text-xs text-muted-foreground">Unique Products</span>
              <p className="text-2xl font-semibold mt-1 tabular-nums text-success">
                {visionStats?.uniqueImageCount ?? 0}
              </p>
              <span className="text-[11px] text-muted-foreground">SHA-256 verified</span>
            </div>
            <div className="p-4 rounded-xl bg-muted/40 border border-border/80">
              <span className="text-xs text-muted-foreground">Duplicate Uploads</span>
              <p className="text-2xl font-semibold mt-1 tabular-nums text-warning">
                {visionStats?.duplicateImageCount ?? 0}
              </p>
              <span className="text-[11px] text-muted-foreground">Perceptual / hash matches</span>
            </div>
            <div className="p-4 rounded-xl bg-muted/40 border border-border/80">
              <span className="text-xs text-muted-foreground">Defect Detection Rate</span>
              <p className="text-2xl font-semibold mt-1 tabular-nums text-primary">
                {visionStats && visionStats.totalVisualAnalyses > 0
                  ? `${Math.round(
                      ((visionStats.totalVisualAnalyses - (visionStats.breakdown.find(b => b.label === "NORMAL")?.count || 0)) /
                        visionStats.totalVisualAnalyses) *
                        100
                    )}%`
                  : "0%"}
              </p>
              <span className="text-[11px] text-muted-foreground">Physical issues detected</span>
            </div>
          </div>

          {visionStats && visionStats.totalVisualAnalyses > 0 ? (
            <div className="pt-2">
              <p className="text-xs font-medium text-muted-foreground mb-3">Defect Distribution Breakdown</p>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={visionStats.breakdown.filter(b => b.count > 0)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="count" name="Images" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
              Attach product photos in AI Analysis to populate live visual intelligence metrics.
            </div>
          )}
        </div>

      </div>
    </>
  );
}