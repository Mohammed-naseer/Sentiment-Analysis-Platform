import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import {
  FileText, Download, Printer, Sparkles, FileType, RotateCcw, X,
  CheckCircle2, AlertTriangle, Loader2, Brain, RefreshCw, Eye,
  TrendingUp, TrendingDown, Zap, ChevronRight, Database, Clock,
  ArrowRight
} from "lucide-react";
import { downloadCSV, downloadPDF, printReport, type ExportRow } from "@/lib/exports";
import { pushActivity } from "@/lib/activity-store";
import { toast } from "sonner";
import { removeJob, retryJob, runExport, useExportJobs, type ExportFormat } from "@/lib/export-jobs-store";
import { useCan } from "@/lib/rbac";
import { datasetApi, type JobSummary, type AnalyticsPayload } from "@/lib/dataset-api";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IntelligenceResultsView } from "@/components/IntelligenceResultsView";

export const Route = createFileRoute("/dashboard/reports")({
  component: Page,
});

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-500/15 text-red-500 border-red-500/30",
  HIGH:     "bg-orange-500/15 text-orange-500 border-orange-500/30",
  MEDIUM:   "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
  LOW:      "bg-blue-500/15 text-blue-500 border-blue-500/30",
};

const STATUS_STYLE: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  completed:  { label: "Completed",  icon: <CheckCircle2 className="size-3.5" />, cls: "text-success bg-success/10" },
  processing: { label: "Processing", icon: <Loader2 className="size-3.5 animate-spin" />, cls: "text-brand bg-brand/10" },
  queued:     { label: "Queued",     icon: <Clock className="size-3.5" />, cls: "text-muted-foreground bg-muted" },
  failed:     { label: "Failed",     icon: <AlertTriangle className="size-3.5" />, cls: "text-danger bg-danger/10" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function SentimentBar({ pos, neg, neu }: { pos: number; neg: number; neu: number }) {
  return (
    <div className="flex h-2 rounded-full overflow-hidden w-full mt-1">
      <div style={{ width: `${pos}%` }} className="bg-success" />
      <div style={{ width: `${neu}%` }} className="bg-muted-foreground/40" />
      <div style={{ width: `${neg}%` }} className="bg-danger" />
    </div>
  );
}

function JobCard({
  job,
  onView,
  onExport,
}: {
  job: JobSummary;
  onView: (job: JobSummary) => void;
  onExport: (job: JobSummary, format: ExportFormat) => void;
}) {
  const st = STATUS_STYLE[job.status] ?? STATUS_STYLE.queued;
  const exec = job.executiveSummary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-card ring-1 ring-border p-5 hover:ring-brand/40 transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-10 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
            <Database className="size-5 text-brand" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{job.fileName}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {job.totalRows.toLocaleString()} rows · {formatDate(job.createdAt)}
            </p>
          </div>
        </div>
        <span className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${st.cls}`}>
          {st.icon} {st.label}
        </span>
      </div>

      {/* Executive Summary strip */}
      {exec && (
        <div className="space-y-2 mb-4">
          <SentimentBar pos={exec.positivePercentage} neg={exec.negativePercentage} neu={exec.neutralPercentage} />
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1 text-success"><TrendingUp className="size-3" /> {exec.positivePercentage.toFixed(1)}% Positive</span>
            <span className="flex items-center gap-1 text-danger"><TrendingDown className="size-3" /> {exec.negativePercentage.toFixed(1)}% Negative</span>
            <span className="ml-auto">{job.discoveredProblemsCount} problem{job.discoveredProblemsCount !== 1 ? "s" : ""} · {job.prioritizedSolutionsCount} solution{job.prioritizedSolutionsCount !== 1 ? "s" : ""}</span>
          </div>
          {exec.top3Problems.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {exec.top3Problems.slice(0, 3).map((p, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-danger/10 text-danger border border-danger/20 font-medium">
                  ⚠ {p}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-border">
        {job.status === "completed" && (
          <>
            <button
              onClick={() => onView(job)}
              className="flex items-center gap-1.5 bg-brand text-white text-xs px-3 py-1.5 rounded-lg font-semibold hover:opacity-90 transition-all"
            >
              <Eye className="size-3.5" /> View Report
            </button>
            <button onClick={() => onExport(job, "pdf")} className="text-xs ring-1 ring-border px-2.5 py-1.5 rounded-lg hover:bg-muted inline-flex items-center gap-1.5">
              <FileType className="size-3.5" /> PDF
            </button>
            <button onClick={() => onExport(job, "csv")} className="text-xs ring-1 ring-border px-2.5 py-1.5 rounded-lg hover:bg-muted inline-flex items-center gap-1.5">
              <Download className="size-3.5" /> CSV
            </button>
            <button onClick={() => onExport(job, "print")} className="size-8 grid place-items-center rounded-lg hover:bg-muted" aria-label="Print">
              <Printer className="size-4" />
            </button>
          </>
        )}
        {job.status === "failed" && (
          <p className="text-xs text-danger">{job.errorMessage ?? "Analysis failed."}</p>
        )}
        {(job.status === "processing" || job.status === "queued") && (
          <div className="flex-1">
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${job.progress}%` }} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">{job.progress}% complete…</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Page() {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingJob, setViewingJob] = useState<{ job: JobSummary; results: AnalyticsPayload } | null>(null);
  const [loadingResults, setLoadingResults] = useState<string | null>(null);

  const exportJobs = useExportJobs();
  const canGenerate = useCan("reports:generate");

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await datasetApi.listJobs();
      if (res.success) setJobs(res.data);
    } catch {
      toast.error("Failed to load intelligence reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJobs(); }, []);

  const handleViewReport = async (job: JobSummary) => {
    setLoadingResults(job.jobId);
    try {
      const res = await datasetApi.getJobResults(job.jobId);
      if (res.success && res.data.results) {
        setViewingJob({ job, results: res.data.results as AnalyticsPayload });
      } else {
        toast.error("Report results not available.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load report.");
    } finally {
      setLoadingResults(null);
    }
  };

  const handleExportJob = (job: JobSummary, format: ExportFormat) => {
    if (!canGenerate) { toast.error("You don't have permission to export reports"); return; }
    const exec = job.executiveSummary;
    const rows: ExportRow[] = exec ? [
      { metric: "File",               value: job.fileName },
      { metric: "Total Records",       value: job.totalRows.toString() },
      { metric: "Positive %",         value: exec.positivePercentage.toFixed(1) + "%" },
      { metric: "Negative %",         value: exec.negativePercentage.toFixed(1) + "%" },
      { metric: "Neutral %",          value: exec.neutralPercentage.toFixed(1) + "%" },
      { metric: "Top Problem 1",      value: exec.top3Problems[0] ?? "—" },
      { metric: "Top Problem 2",      value: exec.top3Problems[1] ?? "—" },
      { metric: "Top Problem 3",      value: exec.top3Problems[2] ?? "—" },
      { metric: "Immediate Action",   value: exec.recommendedImmediateAction },
      { metric: "Discovered Problems",value: job.discoveredProblemsCount.toString() },
      { metric: "Prioritized Solutions", value: job.prioritizedSolutionsCount.toString() },
    ] : [{ metric: "File", value: job.fileName }, { metric: "Status", value: job.status }];

    const summary = exec
      ? `AI Intelligence Report for ${job.fileName}. Positive: ${exec.positivePercentage.toFixed(1)}%, Negative: ${exec.negativePercentage.toFixed(1)}%. Top issues: ${exec.top3Problems.join(", ") || "None"}. ${exec.recommendedImmediateAction}`
      : `Analysis report for ${job.fileName}`;

    const name = `Intelligence Report — ${job.fileName}`;
    const base = slug(name);

    const finalize = () => {
      if (format === "pdf") downloadPDF(`${base}.pdf`, name, rows, summary);
      else if (format === "csv") downloadCSV(`${base}.csv`, rows);
      else printReport(name, rows, summary);
      pushActivity({ kind: "export", title: `${name} exported`, detail: format.toUpperCase() });
    };

    runExport(name, format, finalize);
    toast.success(`${format.toUpperCase()} export queued`);
  };

  const completedJobs = jobs.filter(j => j.status === "completed");
  const activeJobs    = jobs.filter(j => j.status === "processing" || j.status === "queued");
  const failedJobs    = jobs.filter(j => j.status === "failed");

  if (viewingJob) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <DashboardTopbar title="Intelligence Report" />
        <div className="p-4 border-b border-border bg-card">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewingJob(null)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to Reports
              </button>
              <ChevronRight className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium truncate max-w-64">{viewingJob.job.fileName}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleExportJob(viewingJob.job, "pdf")} className="flex items-center gap-1.5 text-xs ring-1 ring-border px-3 py-1.5 rounded-lg hover:bg-muted">
                <FileType className="size-3.5" /> Export PDF
              </button>
              <button onClick={() => handleExportJob(viewingJob.job, "csv")} className="flex items-center gap-1.5 text-xs ring-1 ring-border px-3 py-1.5 rounded-lg hover:bg-muted">
                <Download className="size-3.5" /> Export CSV
              </button>
            </div>
          </div>
        </div>
        <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
          <IntelligenceResultsView results={viewingJob.results} fileName={viewingJob.job.fileName} />
        </main>
      </div>
    );
  }

  return (
    <>
      <DashboardTopbar title="Reports" />
      <div className="p-6 space-y-8 max-w-[1400px] w-full mx-auto">

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Brain className="size-5 text-brand" /> AI Intelligence Reports
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Executive summaries and full intelligence reports from all your dataset analyses.
            </p>
          </div>
          <button
            onClick={fetchJobs}
            disabled={loading}
            className="flex items-center gap-1.5 ring-1 ring-border px-3 py-1.5 rounded-lg text-xs hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {/* Stats strip */}
        {!loading && jobs.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Completed Reports", value: completedJobs.length, color: "text-success", icon: <CheckCircle2 className="size-5" /> },
              { label: "Active / Queued", value: activeJobs.length, color: "text-brand", icon: <Loader2 className="size-5" /> },
              { label: "Failed", value: failedJobs.length, color: "text-danger", icon: <AlertTriangle className="size-5" /> },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="p-5 rounded-xl bg-card ring-1 ring-border flex items-center gap-4"
              >
                <div className={`size-10 rounded-xl bg-muted flex items-center justify-center ${s.color}`}>{s.icon}</div>
                <div>
                  <div className="text-2xl font-bold tabular-nums">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Export jobs queue */}
        {exportJobs.length > 0 && (
          <div className="p-5 rounded-xl bg-card ring-1 ring-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold tracking-tight text-sm">Export Queue</h3>
              <span className="text-xs text-muted-foreground font-mono">{exportJobs.length} job{exportJobs.length !== 1 ? "s" : ""}</span>
            </div>
            <ul className="space-y-2">
              {exportJobs.map((j) => (
                <li key={j.id} className="p-3 rounded-lg ring-1 ring-border bg-background flex items-center gap-3">
                  <div className={`size-8 rounded-lg grid place-items-center shrink-0 ${
                    j.status === "done" ? "bg-success/10 text-success"
                    : j.status === "failed" ? "bg-danger/10 text-danger"
                    : "bg-brand/10 text-brand"
                  }`}>
                    {j.status === "done" ? <CheckCircle2 className="size-4" />
                      : j.status === "failed" ? <AlertTriangle className="size-4" />
                      : <Loader2 className="size-4 animate-spin" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{j.name}</div>
                    <div className="text-[10px] text-muted-foreground flex gap-2">
                      <span className="uppercase font-mono tracking-wider">{j.format}</span>
                      <span>·</span>
                      <span className="capitalize">{j.status}</span>
                      {j.error && <><span>·</span><span className="text-danger">{j.error}</span></>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {j.status === "failed" && (
                      <button onClick={() => retryJob(j.id, () => {})} className="text-xs ring-1 ring-border px-2 py-1 rounded hover:bg-muted inline-flex items-center gap-1">
                        <RotateCcw className="size-3" /> Retry
                      </button>
                    )}
                    <button onClick={() => removeJob(j.id)} className="size-7 grid place-items-center rounded hover:bg-muted" aria-label="Dismiss">
                      <X className="size-3.5" />
                    </button>
                  </div>
                  <div className="w-16 shrink-0">
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full transition-all ${j.status === "failed" ? "bg-danger" : j.status === "done" ? "bg-success" : "bg-brand"}`}
                        style={{ width: `${j.progress}%` }}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Intelligence Reports List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold tracking-tight">Intelligence Reports</h2>
            {completedJobs.length > 0 && (
              <span className="text-xs text-muted-foreground">{completedJobs.length} completed report{completedJobs.length !== 1 ? "s" : ""}</span>
            )}
          </div>

          {loading && (
            <div className="grid gap-4 md:grid-cols-2">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="h-44 rounded-xl bg-card ring-1 ring-border animate-pulse" />
              ))}
            </div>
          )}

          {!loading && jobs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-4 rounded-xl bg-card ring-1 ring-border">
              <div className="size-16 rounded-2xl bg-brand/10 flex items-center justify-center">
                <Brain className="size-8 text-brand/60" />
              </div>
              <div>
                <p className="font-semibold">No intelligence reports yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload a dataset in <strong>AI Data Intelligence</strong> to generate your first report.
                </p>
              </div>
              <a
                href="/dashboard/intelligence"
                className="flex items-center gap-2 bg-brand text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-all"
              >
                <Sparkles className="size-4" /> Go to AI Data Intelligence <ArrowRight className="size-4" />
              </a>
            </div>
          )}

          {!loading && jobs.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              <AnimatePresence>
                {jobs.map((job) => (
                  <JobCard
                    key={job.jobId}
                    job={job}
                    onView={handleViewReport}
                    onExport={handleExportJob}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Loading overlay for results */}
        <AnimatePresence>
          {loadingResults && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4"
            >
              <div className="size-16 rounded-2xl bg-brand/10 flex items-center justify-center">
                <Brain className="size-8 text-brand animate-pulse" />
              </div>
              <div className="text-center">
                <p className="font-bold">Loading Intelligence Report…</p>
                <p className="text-sm text-muted-foreground mt-1">Fetching full analysis results</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </>
  );
}