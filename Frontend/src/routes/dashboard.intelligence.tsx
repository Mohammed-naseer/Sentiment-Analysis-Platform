import { createFileRoute } from "@tanstack/react-router";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileText, X, Sparkles, Database, CheckCircle2,
  AlertTriangle, Loader2, Brain, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { datasetApi, type DatasetProfile, type RecommendedAnalysis, type AnalyticsPayload } from "@/lib/dataset-api";
import { DataProfilerCard } from "@/components/DataProfilerCard";
import { AIDataAssistant } from "@/components/AIDataAssistant";
import { IntelligenceResultsView } from "@/components/IntelligenceResultsView";
import { pushActivity } from "@/lib/activity-store";

export const Route = createFileRoute("/dashboard/intelligence")({
  component: IntelligencePage,
});

type Stage = "idle" | "uploading" | "profiled" | "analyzing" | "done" | "error";

const ACCEPTED_EXTS = ".csv,.xlsx,.xls,.json,.txt,.pdf";

function DropZone({ onFile }: { onFile: (f: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }, [onFile]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`relative flex flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed p-16 cursor-pointer transition-all select-none ${
        dragOver
          ? "border-brand bg-brand/10 scale-[1.01]"
          : "border-border bg-card hover:border-brand/50 hover:bg-brand/5"
      }`}
      suppressHydrationWarning
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTS}
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
      />

      {/* Animated Icon */}
      <div className={`relative flex size-20 items-center justify-center rounded-2xl transition-all ${
        dragOver ? "bg-brand text-white shadow-2xl shadow-brand/40" : "bg-gradient-to-br from-brand/10 to-cyan-500/10 text-brand"
      }`} suppressHydrationWarning>
        <Upload className="size-9" />
        {dragOver && (
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 0.8 }}
            className="absolute inset-0 rounded-2xl border-2 border-brand"
          />
        )}
      </div>

      <div className="text-center space-y-1" suppressHydrationWarning>
        <h2 className="text-lg font-bold">Drop your dataset here</h2>
        <p className="text-sm text-muted-foreground">
          or <span className="text-brand font-semibold underline underline-offset-2">click to browse</span>
        </p>
        <p className="text-xs text-muted-foreground/70 mt-2">
          Supports CSV, Excel (.xlsx), JSON, TXT, PDF — up to 50 MB
        </p>
      </div>

      {/* Format badges */}
      <div className="flex gap-2 flex-wrap justify-center" suppressHydrationWarning>
        {["CSV", "XLSX", "JSON", "TXT", "PDF"].map(ext => (
          <span key={ext} className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
            {ext}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

function JobProgressBar({ progress, processedRows, totalRows }: { progress: number; processedRows: number; totalRows: number }) {
  return (
    <div className="rounded-2xl bg-card ring-1 ring-border p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-brand/10">
          <Brain className="size-5 text-brand animate-pulse" />
        </div>
        <div>
          <h3 className="font-bold text-sm">AI Analysis In Progress</h3>
          <p className="text-xs text-muted-foreground">Processing your dataset with multi-model AI intelligence…</p>
        </div>
        <div className="ml-auto text-2xl font-bold tabular-nums text-brand">{progress}%</div>
      </div>

      {/* Progress Bar */}
      <div className="h-3 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-brand to-cyan-500"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Processed: <b className="text-foreground">{processedRows.toLocaleString()}</b> / {totalRows.toLocaleString()} rows
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-brand animate-pulse" />
          Running multi-model sentiment analysis…
        </span>
      </div>

      {/* Stage indicators */}
      <div className="flex gap-3">
        {[
          { label: "Data Parsing",       done: progress >= 10 },
          { label: "Column Analysis",    done: progress >= 25 },
          { label: "AI Sentiment",       done: progress >= 60 },
          { label: "Pattern Detection",  done: progress >= 85 },
          { label: "Report Generation",  done: progress >= 100 },
        ].map((step, i) => (
          <div key={i} className={`flex items-center gap-1.5 text-[11px] ${step.done ? "text-success" : "text-muted-foreground"}`}>
            {step.done ? <CheckCircle2 className="size-3" /> : <Loader2 className="size-3 animate-spin opacity-40" />}
            {step.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function IntelligencePage() {
  const [stage, setStage] = useState<Stage>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [profile, setProfile] = useState<DatasetProfile | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendedAnalysis[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [processedRows, setProcessedRows] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [results, setResults] = useState<AnalyticsPayload | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetAll = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setStage("idle");
    setFile(null);
    setDatasetId(null);
    setProfile(null);
    setRecommendations([]);
    setJobId(null);
    setProgress(0);
    setProcessedRows(0);
    setTotalRows(0);
    setResults(null);
    setErrorMsg(null);
  };

  // ── Step 1: Upload + Profile ────────────────────────────────────────────────
  const handleFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setStage("uploading");
    setErrorMsg(null);

    toast.loading("Uploading and profiling dataset…", { id: "upload" });

    try {
      const res = await datasetApi.uploadDataset(selectedFile);
      if (!res.success) throw new Error("Upload failed");

      setDatasetId(res.data.datasetId);
      setProfile(res.data.profile);
      setRecommendations(res.data.recommendations);
      setStage("profiled");
      toast.success("Dataset profiled successfully!", { id: "upload" });
      pushActivity({
        kind: "analysis",
        title: "Dataset uploaded and profiled",
        detail: `${selectedFile.name} · ${res.data.profile.totalRows.toLocaleString()} rows`,
      });
    } catch (err: any) {
      setStage("error");
      setErrorMsg(err.message || "Failed to upload and profile dataset.");
      toast.error(err.message || "Upload failed", { id: "upload" });
    }
  };

  // ── Step 2: Start Analysis ──────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!datasetId) return;
    setStage("analyzing");
    setProgress(0);

    const selectedIds = recommendations.filter(r => r.applicable).map(r => r.id);

    try {
      const res = await datasetApi.startAnalysis(datasetId, selectedIds);
      if (!res.success) throw new Error("Failed to queue analysis job");

      const jId = res.data.jobId;
      setJobId(jId);
      toast.info("Analysis job started! Processing your dataset…");

      // Poll for progress
      pollRef.current = setInterval(async () => {
        try {
          const status = await datasetApi.pollJob(jId);
          const d = status.data;
          setProgress(d.progress);
          setProcessedRows(d.processedRows);
          setTotalRows(d.totalRows);

          if (d.status === "completed") {
            clearInterval(pollRef.current!);
            setResults(d.results ?? null);
            setStage("done");
            toast.success("Analysis complete! Intelligence report ready.");
            pushActivity({
              kind: "analysis",
              title: "Dataset intelligence analysis complete",
              detail: `${file?.name ?? "Dataset"} · ${d.totalRows.toLocaleString()} records processed`,
            });
          } else if (d.status === "failed") {
            clearInterval(pollRef.current!);
            setStage("error");
            setErrorMsg(d.errorMessage ?? "Analysis job failed.");
            toast.error(d.errorMessage ?? "Analysis failed.");
          }
        } catch {
          // network blip — keep polling
        }
      }, 1500);
    } catch (err: any) {
      setStage("error");
      setErrorMsg(err.message);
      toast.error(err.message || "Failed to start analysis.");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background" suppressHydrationWarning>
      <DashboardTopbar title="AI Data Intelligence" />
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-6">

        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between" suppressHydrationWarning>
          <div suppressHydrationWarning>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <span className="text-brand">✦</span> AI Data Intelligence
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Upload any dataset. The AI inspects, understands, and guides your analysis.
            </p>
          </div>
          {stage !== "idle" && (
            <button
              onClick={resetAll}
              className="flex items-center gap-2 rounded-xl ring-1 ring-border px-3 py-1.5 text-xs hover:bg-muted transition-all"
            >
              <RefreshCw className="size-3" /> Start Over
            </button>
          )}
        </div>

        {/* ── Stage: Idle — Drop Zone ───────────────────────────────────────── */}
        {stage === "idle" && (
          <DropZone onFile={handleFile} />
        )}

        {/* ── Stage: Uploading ─────────────────────────────────────────────── */}
        {stage === "uploading" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl bg-card ring-1 ring-border p-12 flex flex-col items-center gap-4"
          >
            <div className="relative size-16 flex items-center justify-center rounded-2xl bg-brand/10">
              <Loader2 className="size-8 text-brand animate-spin" />
            </div>
            <div className="text-center">
              <p className="font-bold">Parsing & Profiling Dataset…</p>
              <p className="text-sm text-muted-foreground mt-1">{file?.name}</p>
            </div>
            <p className="text-xs text-muted-foreground text-center max-w-sm">
              Detecting columns, data types, missing values, duplicates, and running AI semantic analysis…
            </p>
          </motion.div>
        )}

        {/* ── Stage: Profiled — Show Profile + AI Assistant ─────────────────── */}
        {(stage === "profiled" || stage === "analyzing" || stage === "done") && profile && (
          <AnimatePresence>
            <motion.div key="profiled" className="space-y-6">
              {/* File badge */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                <FileText className="size-3.5" />
                <span className="font-medium">{file?.name}</span>
                <span>·</span>
                <span>{(file?.size ? file.size / 1024 : 0).toFixed(1)} KB</span>
                <CheckCircle2 className="size-3.5 text-success ml-1" />
                <span className="text-success font-medium">Profiled</span>
              </div>

              {/* Data Profiler Card */}
              <DataProfilerCard profile={profile} fileName={file?.name ?? "dataset"} />

              {/* AI Data Assistant — only show when not yet done */}
              {stage === "profiled" && (
                <AIDataAssistant
                  profile={profile}
                  recommendations={recommendations}
                  onAnalyzeRecommended={handleAnalyze}
                  onCustomize={() => toast.info("Customize mode: select specific analyses from the recommendations list.")}
                  isAnalyzing={false}
                />
              )}

              {/* Progress Bar when analyzing */}
              {stage === "analyzing" && (
                <JobProgressBar
                  progress={progress}
                  processedRows={processedRows}
                  totalRows={totalRows}
                />
              )}

              {/* Intelligence Results */}
              {stage === "done" && results && (
                <IntelligenceResultsView results={results} fileName={file?.name ?? "dataset"} />
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* ── Stage: Error ──────────────────────────────────────────────────── */}
        {stage === "error" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-danger/10 border border-danger/30 p-8 flex flex-col items-center gap-4 text-center"
          >
            <AlertTriangle className="size-10 text-danger" />
            <div>
              <h3 className="font-bold text-danger mb-1">Analysis Failed</h3>
              <p className="text-sm text-muted-foreground">{errorMsg || "An unexpected error occurred."}</p>
            </div>
            <button
              onClick={resetAll}
              className="rounded-xl bg-danger text-white px-5 py-2.5 text-sm font-semibold hover:bg-danger/90 transition-all flex items-center gap-2"
            >
              <RefreshCw className="size-4" /> Try Again
            </button>
          </motion.div>
        )}
      </main>
    </div>
  );
}
