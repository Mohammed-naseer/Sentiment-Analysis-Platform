import { motion } from "framer-motion";
import { Database, FileText, Hash, Calendar, Tag, AlertTriangle, BarChart3, CheckCircle, Sparkles } from "lucide-react";
import type { DatasetProfile, ColumnProfile } from "@/lib/dataset-api";

interface DataProfilerCardProps {
  profile: DatasetProfile;
  fileName: string;
}

function QualityMeter({ score }: { score: number }) {
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";
  const label = score >= 80 ? "High" : score >= 60 ? "Moderate" : "Low";
  const radius = 40;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="100" height="100" className="-rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-border opacity-30" />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute text-center" style={{ marginTop: "-64px" }}>
        <div className="text-2xl font-bold tabular-nums" style={{ color }}>{score}</div>
        <div className="text-xs text-muted-foreground">/ 100</div>
      </div>
      <div className="text-xs font-semibold mt-1" style={{ color }}>{label} Quality</div>
    </div>
  );
}

function ColumnTypeBadge({ col }: { col: ColumnProfile }) {
  const configs: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
    text:        { label: "Text",     icon: <FileText className="size-3" />,   cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
    numeric:     { label: "Numeric",  icon: <Hash className="size-3" />,       cls: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
    date:        { label: "Date",     icon: <Calendar className="size-3" />,   cls: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20" },
    categorical: { label: "Category", icon: <Tag className="size-3" />,        cls: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" },
    unknown:     { label: "Unknown",  icon: <Database className="size-3" />,   cls: "bg-muted text-muted-foreground border-border" },
  };
  const cfg = configs[col.type] ?? configs.unknown;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cfg.cls}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

export function DataProfilerCard({ profile, fileName }: DataProfilerCardProps) {
  const textCols = profile.columns.filter(c => c.type === "text" || c.semanticRole === "feedback_text");
  const numCols  = profile.columns.filter(c => c.type === "numeric");
  const dateCols = profile.columns.filter(c => c.type === "date" || c.semanticRole === "timestamp");
  const catCols  = profile.columns.filter(c => c.type === "categorical");

  const stats = [
    { label: "Total Rows",     value: profile.totalRows.toLocaleString(),   color: "text-brand" },
    { label: "Columns",        value: String(profile.totalColumns),          color: "text-cyan-500" },
    { label: "Text Columns",   value: String(textCols.length),              color: "text-blue-500" },
    { label: "Numeric",        value: String(numCols.length),               color: "text-purple-500" },
    { label: "Date Columns",   value: String(dateCols.length),              color: "text-green-500" },
    { label: "Categories",     value: String(catCols.length),               color: "text-orange-500" },
    { label: "Missing Values", value: `${profile.missingPercentage.toFixed(1)}%`, color: profile.missingPercentage > 10 ? "text-danger" : "text-muted-foreground" },
    { label: "Duplicates",     value: profile.duplicateRowsCount.toLocaleString(), color: profile.duplicateRowsCount > 0 ? "text-warning" : "text-success" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card ring-1 ring-border overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-6 py-4 bg-gradient-to-r from-brand/5 to-cyan-500/5">
        <div className="flex size-10 items-center justify-center rounded-xl bg-brand/10">
          <Database className="size-5 text-brand" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Dataset Profile & Domain Inspection</h3>
          <p className="text-xs text-muted-foreground truncate max-w-xs">{fileName}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted rounded-full px-2 py-0.5">
            {profile.fileType}
          </span>
          <span className="text-xs text-muted-foreground">
            {(profile.fileSize / 1024).toFixed(1)} KB
          </span>
        </div>
      </div>

      {/* Domain Detection Banner */}
      {profile.domainName && (
        <div className="mx-6 mt-6 rounded-xl bg-gradient-to-r from-brand/10 via-brand/5 to-cyan-500/10 border border-brand/20 p-4 flex items-start gap-3">
          <Sparkles className="size-5 text-brand shrink-0 mt-0.5" />
          <div className="space-y-0.5 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-brand uppercase tracking-wider">Detected Domain</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand/20 text-brand">
                {profile.domainConfidence ?? 94}% Confidence
              </span>
            </div>
            <div className="text-sm font-bold text-foreground">{profile.domainName}</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {profile.domainExplanation || "Inferred automatically from dataset columns and sample values."}
            </p>
          </div>
        </div>
      )}

      <div className="p-6 grid lg:grid-cols-3 gap-6">
        {/* Stats Grid */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map(stat => (
            <div key={stat.label} className="rounded-xl bg-muted/40 p-3 flex flex-col gap-1">
              <div className={`text-xl font-bold tabular-nums ${stat.color}`}>{stat.value}</div>
              <div className="text-[11px] text-muted-foreground leading-tight">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Quality Score */}
        <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-muted/30 relative">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Data Quality Score</p>
          <QualityMeter score={profile.qualityScore} />
        </div>
      </div>

      {/* AI Semantic Summary */}
      {profile.semanticSummary && (
        <div className="mx-6 mb-4 rounded-xl bg-brand/5 border border-brand/10 px-4 py-3 flex gap-3">
          <BarChart3 className="size-4 text-brand mt-0.5 shrink-0" />
          <p className="text-sm text-foreground/80 leading-relaxed">{profile.semanticSummary}</p>
        </div>
      )}

      {/* Quality Issues */}
      {profile.qualityIssues.length > 0 && (
        <div className="px-6 pb-4 flex flex-col gap-2">
          {profile.qualityIssues.map((issue, i) => (
            <div key={i} className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${
              issue.includes("completeness") || issue.includes("verified")
                ? "bg-success/10 text-success border border-success/20"
                : "bg-warning/10 text-warning border border-warning/20"
            }`}>
              {issue.includes("completeness") || issue.includes("verified")
                ? <CheckCircle className="size-3.5 shrink-0 mt-0.5" />
                : <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />}
              {issue}
            </div>
          ))}
        </div>
      )}

      {/* Column Table */}
      <div className="border-t border-border">
        <div className="px-6 py-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Column Inspection & Semantic Roles</span>
          <span className="text-xs text-muted-foreground">{profile.columns.length} columns detected</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr>
                {["Column Name", "Type", "Semantic Role", "Missing", "Unique", "Sample Values"].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {profile.columns.map(col => (
                <tr key={col.name} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 font-medium">{col.name}</td>
                  <td className="px-4 py-2.5"><ColumnTypeBadge col={col} /></td>
                  <td className="px-4 py-2.5 capitalize text-muted-foreground">{(col.semanticRole ?? "other").replace(/_/g, " ")}</td>
                  <td className="px-4 py-2.5">
                    <span className={col.missingCount > 0 ? "text-warning" : "text-success"}>
                      {col.missingCount}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{col.uniqueCount}</td>
                  <td className="px-4 py-2.5 text-muted-foreground truncate max-w-[200px]">
                    {col.sampleValues.slice(0, 2).join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
