import { createFileRoute } from "@tanstack/react-router";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Download, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { downloadCSV } from "@/lib/exports";

export const Route = createFileRoute("/dashboard/analytics")({
  component: Page,
});

interface MonthlyPoint { date: string; total: number; positive: number; negative: number; neutral: number }
interface DashboardData {
  monthlyStatistics: MonthlyPoint[];
  agreementDistribution: { level: string; count: number }[];
  providerMetrics: { provider: string; avgConfidence: number }[];
}
interface ApiResponse { success: boolean; data: DashboardData }

const DIST_COLORS = ["#22c55e", "#94a3b8", "#ef4444"];

function Page() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse>("/api/dashboard");
      if (res.success) setData(res.data);
    } catch { /* silent */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const monthly    = data?.monthlyStatistics ?? [];
  const agreement  = data?.agreementDistribution ?? [];
  const providers  = data?.providerMetrics ?? [];
  const distData   = monthly.length
    ? [
        { name: "Positive", value: monthly.reduce((s, d) => s + d.positive, 0), color: DIST_COLORS[0] },
        { name: "Neutral",  value: monthly.reduce((s, d) => s + d.neutral,  0), color: DIST_COLORS[1] },
        { name: "Negative", value: monthly.reduce((s, d) => s + d.negative, 0), color: DIST_COLORS[2] },
      ]
    : [];

  return (
    <>
      <DashboardTopbar title="Analytics" />
      <div className="p-6 space-y-6 max-w-[1600px] w-full mx-auto">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Interactive visualizations from your real analysis data.</p>
          <div className="flex gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="ring-1 ring-border px-3 py-1.5 rounded-lg text-xs hover:bg-muted flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            {["CSV"].map((f) => (
              <button
                key={f}
                onClick={() => downloadCSV("analytics-monthly.csv", monthly as unknown as Record<string, string | number>[])}
                className="ring-1 ring-border px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-muted flex items-center gap-1.5"
              >
                <Download className="size-3.5" /> {f}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Chart title="Monthly review growth" loading={loading} empty={monthly.length === 0}>
            <ResponsiveContainer>
              <AreaChart data={monthly}>
                <defs><linearGradient id="a1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4f46e5" stopOpacity={0.5}/><stop offset="100%" stopColor="#4f46e5" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Area dataKey="positive" stroke="#4f46e5" fill="url(#a1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Chart>

          <Chart title="AI Provider confidence" loading={loading} empty={providers.length === 0}>
            <ResponsiveContainer>
              <BarChart data={providers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis type="number" domain={[0,100]} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis dataKey="provider" type="category" fontSize={11} tickLine={false} axisLine={false} width={90} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="avgConfidence" name="Avg Confidence" fill="#22c55e" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Chart>

          <Chart title="Sentiment trend" loading={loading} empty={monthly.length === 0}>
            <ResponsiveContainer>
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Line dataKey="positive" stroke="#4f46e5" strokeWidth={2} dot={false} />
                <Line dataKey="negative" stroke="#ef4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Chart>

          <Chart title="Model agreement distribution" loading={loading} empty={agreement.length === 0}>
            <ResponsiveContainer>
              <BarChart data={agreement}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="level" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="count" name="Analyses" fill="#06b6d4" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Chart>

          <Chart title="Sentiment distribution" loading={loading} empty={distData.every((d) => d.value === 0)}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={distData} dataKey="value" innerRadius={60} outerRadius={90} paddingAngle={3}>
                  {distData.map((e) => <Cell key={e.name} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </Chart>

          <Chart title="Positive vs Negative over time" loading={loading} empty={monthly.length === 0}>
            <ResponsiveContainer>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="positive" fill="#22c55e" radius={[4,4,0,0]} />
                <Bar dataKey="negative" fill="#ef4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Chart>
        </div>
      </div>
    </>
  );
}

function Chart({ title, loading, empty, children }: {
  title: string;
  loading: boolean;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="p-6 rounded-xl bg-card ring-1 ring-border">
      <h3 className="font-semibold tracking-tight mb-4">{title}</h3>
      <div className="h-64">
        {loading
          ? <div className="h-full bg-muted animate-pulse rounded-xl" />
          : empty
            ? <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
            : children
        }
      </div>
    </div>
  );
}