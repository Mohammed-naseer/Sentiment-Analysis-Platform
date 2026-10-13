import { createFileRoute } from "@tanstack/react-router";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { useForm } from "react-hook-form";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Upload, Sparkles, RotateCcw, Download, FileSpreadsheet, X, Loader2, CheckCircle2, AlertTriangle, Brain, Camera, ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { pushActivity } from "@/lib/activity-store";
import { downloadCSV, downloadPDF } from "@/lib/exports";
import { api } from "@/lib/api";
import { ImageUploadZone } from "@/components/ImageUploadZone";

export const Route = createFileRoute("/dashboard/analysis")({
  component: Page,
});

type FormData = { text: string; product: string; category: string };
type Sentiment = "Positive" | "Neutral" | "Negative" | "Mixed";

interface AspectItem {
  aspect: string;
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  confidence: number;
  evidence: string;
}

interface VisualDefectItem {
  label: string;
  confidence: number;
}

interface ModelResult {
  sentiment: Sentiment;
  confidence: number;
  emotion: string;
  emotionConfidence?: number;
  summary: string;
  status?: "success" | "failed";
  errorCode?: string;
  errorMessage?: string;
  latencyMs?: number;
  model?: string;
}

interface VisualAnalysisData {
  imageId: string;
  imageUrl: string;
  imageHash: string;
  label: string;
  confidence: number;
  multipleDefects?: VisualDefectItem[];
  imageQuality: { usable: boolean; score: number; reason?: string };
  modelName: string;
  modelVersion: string;
}

interface MultimodalCorrelationData {
  textSentiment: string;
  visualIssue: string;
  consistency: "CONSISTENT" | "POTENTIALLY_INCONSISTENT" | "INSUFFICIENT_EVIDENCE";
  confidence: number;
  explanation: string;
}

interface AnalysisResult {
  id: string;
  analysisId?: string;
  text: string;
  inputHash?: string;
  models: {
    gemini: ModelResult;
    groq: ModelResult;
    huggingface: ModelResult;
  };
  finalResult: {
    sentiment: Sentiment;
    confidence?: number;
    agreementPercentage: number;
    mostConfidentModel: string;
    activeProvidersCount?: number;
    totalProvidersCount?: number;
  };
  aspects?: AspectItem[];
}

interface MultimodalResponseData {
  analysisId: string | null;
  text: AnalysisResult;
  visual?: VisualAnalysisData;
  multimodal?: MultimodalCorrelationData;
}

interface ApiResponse {
  success: boolean;
  data: AnalysisResult;
}

interface ApiMultimodalResponse {
  success: boolean;
  data: MultimodalResponseData;
}

type BatchRow = { text: string; sentiment: string; confidence: number; emotion: string; keywords: string };

const MODEL_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  gemini:      { label: "Google Gemini", color: "#4f46e5", icon: "✦" },
  groq:        { label: "Groq (Llama)",  color: "#06b6d4", icon: "⚡" },
  huggingface: { label: "HuggingFace",   color: "#f59e0b", icon: "🤗" },
};

const SENTIMENT_STYLE: Record<string, string> = {
  Positive: "bg-success/10 text-success border-success/20",
  Negative: "bg-danger/10 text-danger border-danger/20",
  Neutral:  "bg-warning/10 text-warning border-warning/20",
  Mixed:    "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

function Page() {
  const fileRef = useRef<HTMLInputElement>(null);
  const { register, handleSubmit, reset } = useForm<FormData>({
    defaultValues: {
      text: "The new titanium chassis feels incredible, but the software still hangs when uploading 4K timelines. Support was fast but the issue persists.",
      product: "Enterprise Plan",
      category: "SaaS",
    },
  });

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [visualData, setVisualData] = useState<VisualAnalysisData | null>(null);
  const [multimodalData, setMultimodalData] = useState<MultimodalCorrelationData | null>(null);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [batch, setBatch] = useState<BatchRow[] | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [uploadName, setUploadName] = useState<string | null>(null);

  // ── Single analysis (Text or Combined Multimodal) ─────────────────────────
  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setResult(null);
    setVisualData(null);
    setMultimodalData(null);
    setFeedbackGiven(null);
    try {
      if (selectedImageFile) {
        // Send multipart form to /api/vision/multimodal
        const formData = new FormData();
        formData.append("text", data.text);
        formData.append("image", selectedImageFile);
        formData.append("productCategory", data.category || "General");

        const res = await api.upload<ApiMultimodalResponse>("/api/vision/multimodal", formData);
        if (res.success && res.data) {
          setResult(res.data.text);
          setVisualData(res.data.visual || null);
          setMultimodalData(res.data.multimodal || null);
          setCurrentAnalysisId(res.data.analysisId);
          pushActivity({
            kind: "analysis",
            title: "Multimodal Text & Vision Analysis complete",
            detail: `${data.product} · Text: ${res.data.text.finalResult.sentiment} · Defect: ${res.data.visual?.label || 'None'}`,
          });
          toast.success("Multimodal analysis complete with visual defect intelligence!");
        }
      } else {
        // Existing standard text-only flow
        const res = await api.post<ApiResponse>("/api/sentiment/analyze", { text: data.text });
        if (res.success) {
          setResult(res.data);
          setCurrentAnalysisId(res.data.id);
          pushActivity({
            kind: "analysis",
            title: "Multi-model analysis complete",
            detail: `${data.product} · ${res.data.finalResult.sentiment} · ${res.data.finalResult.agreementPercentage}% agreement`,
          });
          toast.success("Analysis complete — all 3 AI models responded!");
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Analysis failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (isCorrect: boolean) => {
    if (!currentAnalysisId) return;
    try {
      await api.post("/api/vision/feedback", {
        analysisId: currentAnalysisId,
        isCorrect,
      });
      setFeedbackGiven(isCorrect);
      toast.success("Thank you for your feedback!");
    } catch {
      toast.error("Failed to record feedback.");
    }
  };

  // ── Batch analysis (local XLSX parsing + per-row API call) ────────────────
  const runOnBuffer = async (fileName: string, _size: number, buf: ArrayBuffer) => {
    setBatchLoading(true);
    try {
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const textCol = rows.length
        ? Object.keys(rows[0]).find((k) => /text|review|comment|message/i.test(k)) ?? Object.keys(rows[0])[0]
        : null;
      if (!textCol) throw new Error("Could not detect a text column");

      const analyzed: BatchRow[] = [];
      const slice = rows.slice(0, 50); // cap at 50 for speed
      for (const row of slice) {
        const text = String(row[textCol] ?? "");
        if (!text.trim()) continue;
        try {
          const res = await api.post<ApiResponse>("/api/sentiment/analyze", { text });
          analyzed.push({
            text,
            sentiment: res.data.finalResult.sentiment,
            confidence: res.data.models.gemini.confidence,
            emotion: res.data.models.gemini.emotion,
            keywords: "",
          });
        } catch {
          analyzed.push({ text, sentiment: "Neutral", confidence: 50, emotion: "Unknown", keywords: "" });
        }
      }
      setBatch(analyzed);
      pushActivity({ kind: "upload", title: `${fileName} batch complete`, detail: `${analyzed.length} rows analyzed` });
      toast.success(`Analyzed ${analyzed.length} reviews`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to parse file");
      setBatch(null);
      setUploadName(null);
    } finally {
      setBatchLoading(false);
    }
  };

  const onFile = async (file: File) => {
    setUploadName(file.name);
    const buf = await file.arrayBuffer();
    await runOnBuffer(file.name, file.size, buf);
  };

  return (
    <>
      <DashboardTopbar title="AI Analysis" />
      <div className="p-6 space-y-6 max-w-[1400px] w-full mx-auto">

        {/* ── Input form ─────────────────────────────────────────────── */}
        <div className="p-6 rounded-xl bg-card ring-1 ring-border space-y-4">
          <div className="flex items-center gap-2">
            <Brain className="size-5 text-brand" />
            <h3 className="font-semibold tracking-tight">Multi-Model Sentiment Analysis</h3>
            <span className="text-[10px] uppercase tracking-widest bg-brand/10 text-brand px-2 py-0.5 rounded-full font-semibold ml-auto">
              Gemini + Groq + HuggingFace
            </span>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <textarea
              rows={4}
              {...register("text", { required: true })}
              className="input-field resize-none text-sm"
              placeholder="Enter customer review or any text to analyse…"
            />
            
            {/* Optional Image Upload Zone for Multimodal Vision Intelligence */}
            <ImageUploadZone
              disabled={loading}
              onImageSelected={(file) => setSelectedImageFile(file)}
            />

            <div className="flex gap-3 flex-wrap">
              <input {...register("product")} className="input-field flex-1 min-w-40 text-sm" placeholder="Product / Plan" />
              <input {...register("category")} className="input-field w-36 text-sm" placeholder="Category" />
              <button
                disabled={loading}
                className="bg-brand text-white px-6 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-60 flex items-center gap-2 shrink-0"
              >
                {loading ? <><Loader2 className="size-4 animate-spin" /> Analysing…</> : <><Sparkles className="size-4" /> {selectedImageFile ? "Analyse Multimodal" : "Analyse"}</>}
              </button>
              <button type="button" onClick={() => { reset(); setResult(null); setVisualData(null); setMultimodalData(null); setSelectedImageFile(null); }} className="ring-1 ring-border px-3 py-2 rounded-lg text-sm hover:bg-muted">
                <RotateCcw className="size-4" />
              </button>
            </div>
          </form>
        </div>

        {/* ── Loading skeleton ────────────────────────────────────────── */}
        {loading && (
          <div className="grid gap-4 md:grid-cols-3">
            {["Gemini", "Groq", "HuggingFace"].map((m) => (
              <div key={m} className="p-5 rounded-xl bg-card ring-1 ring-border animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-8 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-5/6" />
              </div>
            ))}
          </div>
        )}

        {/* ── Results: 3 model cards ──────────────────────────────────── */}
        {result && !loading && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Model cards */}
            <div className="grid gap-4 md:grid-cols-3">
              {(["gemini", "groq", "huggingface"] as const).map((key, i) => {
                const m = result.models[key];
                const meta = MODEL_LABELS[key];
                const isFailed = m.status === "failed" || m.summary?.includes("[Fallback]") || m.confidence === 0;
                const isBest = !isFailed && (
                  result.finalResult.mostConfidentModel.toLowerCase().includes(key) ||
                  result.finalResult.mostConfidentModel.toLowerCase() === key
                );

                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className={`p-5 rounded-xl bg-card ring-1 ${
                      isFailed
                        ? "ring-danger/40 bg-danger/[0.02]"
                        : isBest
                        ? "ring-brand shadow-lg shadow-brand/10"
                        : "ring-border"
                    } space-y-3`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {meta.icon} {meta.label}
                      </span>
                      {isFailed ? (
                        <span className="text-[10px] bg-danger/10 text-danger px-2 py-0.5 rounded-full font-semibold">
                          Provider Failed
                        </span>
                      ) : isBest ? (
                        <span className="text-[10px] bg-brand/10 text-brand px-2 py-0.5 rounded-full font-semibold">
                          Most Confident
                        </span>
                      ) : (
                        <span className="text-[10px] bg-success/10 text-success px-2 py-0.5 rounded-full font-semibold">
                          Active
                        </span>
                      )}
                    </div>

                    {isFailed ? (
                      <div className="space-y-2 pt-1">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold bg-danger/10 text-danger border-danger/20">
                          <AlertTriangle className="size-4" />
                          Provider Failed
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Reason: <span className="font-medium text-foreground">{m.errorMessage || m.summary?.replace('[Fallback]', '').trim() || "Service temporarily unavailable"}</span>
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold ${SENTIMENT_STYLE[m.sentiment] || "bg-muted"}`}>
                          {m.sentiment === "Positive" ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
                          {m.sentiment}
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Confidence</span>
                            <span className="font-mono font-semibold">{m.confidence}%</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${m.confidence}%`, background: meta.color }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                          <span>Emotion: <strong className="text-foreground">{m.emotion}</strong></span>
                          <span>Signal: <strong className="font-mono text-foreground">{m.emotionConfidence || m.confidence}%</strong></span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{m.summary}</p>
                      </>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Final verdict */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25 }}
              className="p-6 rounded-xl bg-gradient-to-br from-brand/5 to-accent-cyan/5 ring-1 ring-brand/20"
            >
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-1">Final Verdict</p>
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-lg font-bold ${SENTIMENT_STYLE[result.finalResult.sentiment] || "bg-muted"}`}>
                    {result.finalResult.sentiment === "Positive"
                      ? "😊"
                      : result.finalResult.sentiment === "Negative"
                      ? "😞"
                      : result.finalResult.sentiment === "Mixed"
                      ? "⚖️"
                      : "😐"}
                    {result.finalResult.sentiment}
                  </div>
                  {result.finalResult.confidence && (
                    <span className="ml-3 text-xs text-muted-foreground font-semibold">
                      Confidence: {result.finalResult.confidence}%
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-1">Model agreement</p>
                  <div className="text-3xl font-bold tabular-nums text-brand">{result.finalResult.agreementPercentage}%</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Successful Models: {result.finalResult.activeProvidersCount ?? 2}/{result.finalResult.totalProvidersCount ?? 3} · Best: {result.finalResult.mostConfidentModel}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => downloadCSV("analysis.csv", [{ text: result.text, ...result.finalResult }])}
                  className="ring-1 ring-border px-3 py-1.5 rounded-lg text-xs hover:bg-muted flex items-center gap-1.5"
                >
                  <Download className="size-3" /> CSV
                </button>
                <button
                  onClick={() => downloadPDF("analysis.pdf", "Analysis Result", [{ text: result.text, ...result.finalResult }])}
                  className="ring-1 ring-border px-3 py-1.5 rounded-lg text-xs hover:bg-muted flex items-center gap-1.5"
                >
                  <Download className="size-3" /> PDF
                </button>
              </div>
            </motion.div>

            {/* ── Aspect-Based Sentiment Table ─────────────────────────── */}
            {result.aspects && result.aspects.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28 }}
                className="p-6 rounded-xl bg-card ring-1 ring-border space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold tracking-tight text-foreground">Aspect-Based Sentiment Intelligence</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Granular feature-level sentiments with traceable verbatim quotes</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand/10 text-brand">
                    {result.aspects.length} Aspects Extracted
                  </span>
                </div>

                <div className="overflow-x-auto rounded-lg ring-1 ring-border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Aspect</th>
                        <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Sentiment</th>
                        <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Confidence</th>
                        <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Evidence Quote from Text</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {result.aspects.map((asp, idx) => (
                        <tr key={idx} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2.5 font-semibold text-foreground">{asp.aspect}</td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              asp.sentiment === "POSITIVE"
                                ? "bg-success/10 text-success border border-success/20"
                                : asp.sentiment === "NEGATIVE"
                                ? "bg-danger/10 text-danger border border-danger/20"
                                : "bg-warning/10 text-warning border border-warning/20"
                            }`}>
                              {asp.sentiment}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-muted-foreground">
                            {Math.round(asp.confidence * 100)}%
                          </td>
                          <td className="px-4 py-2.5 italic text-muted-foreground max-w-[400px]">
                            "{asp.evidence}"
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* ── Multimodal Visual Intelligence Section ───────────────── */}
            {visualData && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-6 rounded-xl bg-card ring-1 ring-border space-y-5"
              >
                <div className="flex items-center gap-2">
                  <Camera className="size-5 text-accent-cyan" />
                  <h4 className="font-semibold tracking-tight text-foreground">Visual Intelligence & Defect Analysis</h4>
                  <span className="text-[10px] uppercase tracking-widest bg-accent-cyan/10 text-accent-cyan px-2 py-0.5 rounded-full font-semibold ml-auto">
                    {visualData.modelName} v{visualData.modelVersion}
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-3 items-start">
                  {/* Image Preview & Quality */}
                  <div className="space-y-2">
                    <div className="rounded-lg overflow-hidden border border-border bg-background aspect-video max-h-44 flex items-center justify-center">
                      <img
                        src={`http://localhost:5001${visualData.imageUrl}`}
                        alt="Analyzed Product"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                      <span>Image Quality</span>
                      <span className={visualData.imageQuality.usable ? "text-success font-medium" : "text-warning font-medium"}>
                        {visualData.imageQuality.usable ? "Diagnostics Verified" : visualData.imageQuality.reason || "Low Quality"}
                      </span>
                    </div>
                  </div>

                  {/* Defect Classification & Multiple Issues */}
                  <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-3">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Detected Visual Issues</p>
                    {visualData.multipleDefects && visualData.multipleDefects.length > 0 ? (
                      <div className="space-y-2">
                        {visualData.multipleDefects.map((def, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-background border border-border text-xs">
                            <span className="font-bold flex items-center gap-1.5">
                              <span className="size-2 rounded-full bg-accent-cyan" />
                              {def.label.replace(/_/g, " ")}
                            </span>
                            <span className="font-mono text-muted-foreground font-semibold">
                              {Math.round(def.confidence * 100)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold bg-background border-border">
                        <span className="size-2 rounded-full bg-accent-cyan" />
                        {visualData.label.replace(/_/g, " ")}
                      </div>
                    )}
                  </div>

                  {/* Multimodal Cross-Modal Consistency */}
                  {multimodalData && (
                    <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-3">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Text-Vision Alignment</p>
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                        multimodalData.consistency === "CONSISTENT"
                          ? "bg-success/10 text-success border-success/20"
                          : multimodalData.consistency === "POTENTIALLY_INCONSISTENT"
                          ? "bg-warning/10 text-warning border-warning/20"
                          : "bg-muted text-muted-foreground border-border"
                      }`}>
                        {multimodalData.consistency.replace(/_/g, " ")}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {multimodalData.explanation}
                      </p>
                    </div>
                  )}
                </div>

                {/* Human-in-the-loop verification */}
                <div className="pt-3 border-t border-border flex items-center justify-between flex-wrap gap-3">
                  <span className="text-xs text-muted-foreground">
                    Was this visual classification correct?
                  </span>
                  {feedbackGiven !== null ? (
                    <span className="text-xs text-success font-medium flex items-center gap-1">
                      <CheckCircle2 className="size-3.5" /> Feedback recorded ({feedbackGiven ? "Correct" : "Incorrect"})
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleFeedback(true)}
                        className="ring-1 ring-border px-2.5 py-1 rounded-lg text-xs hover:bg-muted text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
                      >
                        <ThumbsUp className="size-3 text-success" /> Correct
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFeedback(false)}
                        className="ring-1 ring-border px-2.5 py-1 rounded-lg text-xs hover:bg-muted text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
                      >
                        <ThumbsDown className="size-3 text-danger" /> Incorrect
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── Batch upload ────────────────────────────────────────────── */}
        <div className="p-6 rounded-xl bg-card ring-1 ring-border space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold tracking-tight">Batch Analysis</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Upload an Excel/CSV with a text column — up to 50 rows via AI</p>
            </div>
            {uploadName && (
              <button onClick={() => { setUploadName(null); setBatch(null); }} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            )}
          </div>

          {!uploadName ? (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-xl py-10 flex flex-col items-center gap-3 hover:border-brand/50 hover:bg-brand/5 transition-colors"
            >
              <Upload className="size-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Drop an Excel/CSV here or click to browse</span>
              <span className="text-xs text-muted-foreground/60">.xlsx, .xls, .csv — max 50 rows</span>
            </button>
          ) : (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
              <FileSpreadsheet className="size-8 text-brand shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{uploadName}</p>
                {batchLoading && <p className="text-xs text-muted-foreground animate-pulse">Sending rows to AI…</p>}
              </div>
              {batchLoading && <Loader2 className="size-5 animate-spin text-brand shrink-0" />}
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
          />

          {batch && batch.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{batch.length} rows analyzed</p>
                <button
                  onClick={() => downloadCSV("batch-analysis.csv", batch as unknown as Record<string, string | number>[])}
                  className="ring-1 ring-border px-3 py-1.5 rounded-lg text-xs hover:bg-muted flex items-center gap-1.5"
                >
                  <Download className="size-3" /> Export CSV
                </button>
              </div>
              <div className="overflow-x-auto rounded-xl ring-1 ring-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>{["Text", "Sentiment", "Confidence", "Emotion"].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-muted-foreground font-medium">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {batch.slice(0, 20).map((row, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="px-4 py-2.5 max-w-[280px] truncate text-muted-foreground">{row.text}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${SENTIMENT_STYLE[row.sentiment] ?? "bg-muted"}`}>
                            {row.sentiment}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono">{row.confidence}%</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{row.emotion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {batch.length > 20 && (
                  <p className="text-xs text-center text-muted-foreground py-3">Showing 20 of {batch.length} rows. Export CSV for full data.</p>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </>
  );
}