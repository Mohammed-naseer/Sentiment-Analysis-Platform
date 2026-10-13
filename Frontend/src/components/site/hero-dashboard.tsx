import { AreaChart, Area, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { sentimentTrend, sentimentDistribution } from "@/lib/mock-data";
import { LayoutDashboard, MessageSquare, LineChart, Boxes, FileText, Settings, Search, Bell } from "lucide-react";

export function HeroDashboard() {
  return (
    <div className="w-full p-3 bg-muted/60 rounded-3xl ring-1 ring-border shadow-2xl">
      <div className="bg-background rounded-2xl overflow-hidden ring-1 ring-border h-[560px] flex">
        {/* Sidebar */}
        <aside className="w-52 border-r border-border p-3 hidden md:flex flex-col">
          <div className="flex items-center gap-2 px-2 py-2 mb-4">
            <div className="size-6 rounded-md bg-gradient-to-br from-brand to-accent-cyan" />
            <span className="text-sm font-semibold tracking-tight">Lumina</span>
          </div>
          <nav className="space-y-0.5 text-sm">
            {[
              { icon: LayoutDashboard, label: "Overview", active: true },
              { icon: MessageSquare, label: "Analysis" },
              { icon: LineChart, label: "Analytics" },
              { icon: Boxes, label: "Products" },
              { icon: FileText, label: "Reports" },
              { icon: Settings, label: "Settings" },
            ].map((i) => (
              <div key={i.label} className={`px-2.5 py-2 rounded-lg flex items-center gap-2.5 ${i.active ? "bg-muted font-medium" : "text-muted-foreground"}`}>
                <i.icon className="size-4" /> {i.label}
              </div>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-hidden bg-muted/30 flex flex-col">
          <header className="h-12 border-b border-border px-5 flex items-center justify-between bg-background">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Search className="size-3.5" /> Search reviews, aspects, products…
            </div>
            <Bell className="size-4 text-muted-foreground" />
          </header>
          <div className="p-5 flex-1 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold">Customer sentiment</h3>
                <p className="text-[10px] text-muted-foreground">Updated 4 min ago</p>
              </div>
              <span className="text-[10px] font-mono px-2 py-1 rounded bg-success/10 text-success">LIVE</span>
            </div>

            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { l: "Reviews", v: "128,492", d: "+12.4%" },
                { l: "Rating", v: "4.82", d: "+0.06" },
                { l: "Confidence", v: "99.4%", d: "Optimal" },
                { l: "Positive", v: "88%", d: "+3%" },
              ].map((k) => (
                <div key={k.l} className="p-3 bg-background rounded-lg ring-1 ring-border">
                  <div className="text-[10px] text-muted-foreground">{k.l}</div>
                  <div className="text-lg font-semibold mt-0.5">{k.v}</div>
                  <div className="text-[10px] text-success">{k.d}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 h-[280px]">
              <div className="col-span-2 p-4 bg-background rounded-lg ring-1 ring-border flex flex-col">
                <div className="text-xs font-medium mb-2">Sentiment trendline</div>
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sentimentTrend}>
                      <defs>
                        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <Area dataKey="positive" stroke="#4f46e5" fill="url(#g1)" strokeWidth={2} />
                      <Area dataKey="neutral" stroke="#06b6d4" fill="url(#g2)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="p-4 bg-background rounded-lg ring-1 ring-border flex flex-col">
                <div className="text-xs font-medium mb-2">Distribution</div>
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={sentimentDistribution} dataKey="value" innerRadius={40} outerRadius={60} paddingAngle={3}>
                        {sentimentDistribution.map((e) => <Cell key={e.name} fill={e.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1 text-[10px] mt-1">
                  {sentimentDistribution.map((s) => (
                    <div key={s.name} className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: s.color }} />{s.name}</span>
                      <span className="font-mono">{s.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}