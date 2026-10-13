import { motion } from "framer-motion";
import {
  Brain, AlertTriangle, CheckCircle2, MessageSquare, Volume2,
  ShieldAlert, Sparkles, Layers, ListOrdered, FileText, Activity
} from "lucide-react";

export interface MultimodalResultPayload {
  inputMode: 'text' | 'voice' | 'multimodal';
  transcript: string;
  language: string;
  durationSeconds?: number;
  overallSentiment: 'Positive' | 'Negative' | 'Neutral' | 'Mixed';
  sentimentConfidence: number;
  emotionScores: { emotion: string; label: string; percentage: number; confidence: number }[];
  primaryEmotionIndicator: string;
  audioSignals?: { energy: string; pace: string; interpretation: string };
  signalAgreement: {
    isAgreement: boolean;
    textSignal: string;
    audioSignal?: string;
    explanation: string;
  };
  emotionTimeline?: { timeWindow: string; emotionIndicator: string; confidence: number }[];
  discoveredProblems: any[];
  rootCauses: any[];
  prioritizedSolutions: any[];
  actionPlan: any[];
  evidenceQuotes: string[];
  disclaimer: string;
}

export function MultimodalEmotionView({ results }: { results: MultimodalResultPayload }) {
  const {
    transcript,
    language,
    durationSeconds,
    overallSentiment,
    emotionScores,
    primaryEmotionIndicator,
    audioSignals,
    signalAgreement,
    emotionTimeline,
    discoveredProblems,
    rootCauses,
    actionPlan,
    disclaimer
  } = results;

  const sentimentColor = overallSentiment === 'Positive' ? 'text-success bg-success/10'
    : overallSentiment === 'Negative' ? 'text-danger bg-danger/10'
    : overallSentiment === 'Mixed' ? 'text-purple-500 bg-purple-500/10'
    : 'text-warning bg-warning/10';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Disclaimer Banner */}
      <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-600 font-medium">
        {disclaimer}
      </div>

      {/* ── 1. Multimodal Signal Agreement / Disagreement Banner ──────────── */}
      {!signalAgreement.isAgreement ? (
        <div className="rounded-2xl bg-amber-500/15 border border-amber-500/40 p-5 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-600 text-sm">
            <AlertTriangle className="size-5 shrink-0" />
            <span>MULTIMODAL SIGNAL DISAGREEMENT DETECTED</span>
          </div>
          <p className="text-xs text-foreground/90 leading-relaxed">{signalAgreement.explanation}</p>
          <div className="grid md:grid-cols-2 gap-3 pt-2 text-xs">
            <div className="rounded-lg bg-card p-2.5 border border-border">
              <strong className="text-muted-foreground block text-[10px] uppercase">Text Signal:</strong>
              {signalAgreement.textSignal}
            </div>
            <div className="rounded-lg bg-card p-2.5 border border-border">
              <strong className="text-muted-foreground block text-[10px] uppercase">Audio Vocal Signal:</strong>
              {signalAgreement.audioSignal || "Acoustic divergence"}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 flex items-center gap-3 text-xs text-emerald-600 font-semibold">
          <CheckCircle2 className="size-5 shrink-0" />
          <span>Multimodal Signal Agreement Verified — Textual and acoustic signals align consistently.</span>
        </div>
      )}

      {/* ── 2. Transcript & Overview Card ────────────────────────────────── */}
      <div className="rounded-2xl bg-card ring-1 ring-border p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-4 text-brand" />
            <h3 className="font-bold text-sm">Speech Transcript & Sentiment</h3>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${sentimentColor}`}>
            {overallSentiment} Sentiment
          </span>
        </div>

        <div className="rounded-xl bg-muted/40 p-4 border border-border">
          <p className="text-sm font-medium text-foreground italic leading-relaxed">
            "{transcript}"
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3 pt-2 border-t border-border/50">
            <span>Language: <strong className="text-foreground">{language}</strong></span>
            {durationSeconds && <span>Duration: <strong className="text-foreground">{durationSeconds}s</strong></span>}
            <span>Primary Signal: <strong className="text-brand">{primaryEmotionIndicator}</strong></span>
          </div>
        </div>

        {audioSignals && (
          <div className="rounded-xl bg-brand/5 border border-brand/20 p-4 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand flex items-center gap-1.5">
              <Volume2 className="size-4" /> Acoustic Audio Signals Analysis
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{audioSignals.interpretation}</p>
          </div>
        )}
      </div>

      {/* ── 3. Emotion Indicators & Confidence Bars ───────────────────────── */}
      <div className="rounded-2xl bg-card ring-1 ring-border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Brain className="size-4 text-brand" />
          <h3 className="font-bold text-sm">Detected Emotional Indicators & Confidence</h3>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {emotionScores.map((sc) => (
            <div key={sc.emotion} className="rounded-xl bg-muted/30 p-4 border border-border space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-foreground">{sc.label}</span>
                <span className="text-brand font-bold">{sc.percentage}% match ({sc.confidence}% confidence)</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-brand to-cyan-500" style={{ width: `${sc.percentage}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 4. Emotion Timeline (If available) ─────────────────────────────── */}
      {emotionTimeline && emotionTimeline.length > 0 && (
        <div className="rounded-2xl bg-card ring-1 ring-border p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-brand" />
            <h3 className="font-bold text-sm">Audio Emotion Timeline Windows</h3>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {emotionTimeline.map((item, idx) => (
              <div key={idx} className="rounded-xl bg-muted/40 p-3 border border-border text-center space-y-1">
                <div className="text-[10px] font-bold text-muted-foreground uppercase">{item.timeWindow}</div>
                <div className="text-xs font-semibold text-foreground">{item.emotionIndicator}</div>
                <div className="text-[10px] text-brand font-mono">{item.confidence}% confidence</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 5. Discovered Problem & Action Plan Pipeline ────────────────────── */}
      {discoveredProblems.length > 0 && (
        <div className="rounded-2xl bg-card ring-1 ring-border p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-4 text-danger" />
            <h3 className="font-bold text-sm">Mapped Problem Discovery & Recommended Action</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {discoveredProblems.map((prob: any) => (
              <div key={prob.id} className="rounded-xl bg-danger/5 border border-danger/20 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-danger uppercase tracking-wider">{prob.priority} Priority</span>
                  <span className="font-semibold text-muted-foreground">Severity: {prob.severityScore}/100</span>
                </div>
                <h4 className="font-bold text-sm">{prob.title}</h4>
                <p className="text-xs text-muted-foreground">Mapped directly from customer voice/text feedback.</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
