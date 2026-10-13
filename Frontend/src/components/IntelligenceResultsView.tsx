import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, TrendingDown, TrendingUp, BarChart3, Lightbulb, Brain, Target,
  CheckCircle2, AlertCircle, Layers, ShieldAlert, ArrowRight, Zap, Check, ChevronRight,
  Info, MessageSquare, ListOrdered, FileSpreadsheet
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, LineChart, Line, CartesianGrid } from "recharts";
import type { AnalyticsPayload, DiscoveredProblem, PrioritizedSolution } from "@/lib/dataset-api";

interface IntelligenceResultsViewProps {
  results: AnalyticsPayload;
  fileName: string;
}

const SENTIMENT_COLORS = { positive: "#22c55e", negative: "#ef4444", neutral: "#f59e0b", mixed: "#8b5cf6" };

const SEVERITY_BADGE: Record<string, string> = {
  CRITICAL: "bg-red-500/10 text-red-500 border-red-500/30",
  HIGH: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  MEDIUM: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  LOW: "bg-blue-500/10 text-blue-500 border-blue-500/30",
};

function SectionHeader({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex size-8 items-center justify-center rounded-lg bg-brand/10 text-brand">{icon}</div>
      <div>
        <h3 className="font-bold text-sm">{title}</h3>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

export function IntelligenceResultsView({ results, fileName }: IntelligenceResultsViewProps) {
  const {
    sentimentSummary,
    aspects,
    emergingIssues,
    discoveredProblems = [],
    rootCauses,
    prioritizedSolutions = [],
    actionPlan = [],
    improvementAreas = [],
    executiveSummary,
    trendData,
    modelDisagreements,
    actionableRecommendations
  } = results;

  const total = sentimentSummary.total || 1;
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(
    discoveredProblems[0]?.id || null
  );

  const selectedProblem = discoveredProblems.find(p => p.id === selectedProblemId) || discoveredProblems[0];
  const selectedSolution = prioritizedSolutions.find(s => s.problemId === selectedProblem?.id) || prioritizedSolutions[0];

  const pieData = [
    { name: "Positive", value: sentimentSummary.positive, fill: SENTIMENT_COLORS.positive },
    { name: "Negative", value: sentimentSummary.negative, fill: SENTIMENT_COLORS.negative },
    { name: "Neutral",  value: sentimentSummary.neutral,  fill: SENTIMENT_COLORS.neutral },
    { name: "Mixed",    value: sentimentSummary.mixed,    fill: SENTIMENT_COLORS.mixed },
  ].filter(d => d.value > 0);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* ── 1. Executive Summary & Top Callout ───────────────────────────── */}
        <div className="rounded-2xl bg-gradient-to-br from-brand/10 via-card to-card ring-1 ring-brand/30 p-6 shadow-lg">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-brand text-white shadow-md shadow-brand/30">
                <Brain className="size-5" />
              </div>
              <div>
                <h2 className="text-base font-bold">Executive Intelligence Summary</h2>
                <p className="text-xs text-muted-foreground">Synthesized from {total.toLocaleString()} analyzed records in {fileName}</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-brand/20 text-brand border border-brand/30">
              AI Problem Intelligence Active
            </span>
          </div>

          <p className="text-sm text-foreground/90 leading-relaxed mb-4">
            {executiveSummary?.highestPriorityReason || `Overall sentiment is ${Math.round((sentimentSummary.positive/total)*100)}% positive and ${Math.round((sentimentSummary.negative/total)*100)}% negative across ${total.toLocaleString()} customer feedback records.`}
          </p>

          <div className="rounded-xl bg-brand/10 border border-brand/20 p-4 flex items-start gap-3">
            <Target className="size-5 text-brand shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-brand uppercase tracking-wider">Recommended Immediate First Action</div>
              <div className="text-sm font-semibold mt-0.5">
                {executiveSummary?.recommendedImmediateAction || actionableRecommendations[0]?.recommendation || "Prioritize high-severity negative feedback resolution."}
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. Discovered Problems & Severity Scoring Matrix ─────────────── */}
        {discoveredProblems.length > 0 && (
          <div className="rounded-2xl bg-card ring-1 ring-border p-6 space-y-4">
            <SectionHeader
              icon={<ShieldAlert className="size-4" />}
              title="Discovered Problems & Severity Scores"
              sub="Automatically extracted friction points ranked by Severity Score (0-100)"
            />

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {discoveredProblems.map(prob => (
                <div
                  key={prob.id}
                  onClick={() => setSelectedProblemId(prob.id)}
                  className={`rounded-xl border p-4 cursor-pointer transition-all ${
                    selectedProblemId === prob.id
                      ? "border-brand bg-brand/5 ring-2 ring-brand/20 shadow-md"
                      : "border-border bg-card hover:border-brand/40 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${SEVERITY_BADGE[prob.priority]}`}>
                      {prob.priority} · {prob.severityScore}/100 Severity
                    </span>
                    <span className="text-xs text-muted-foreground font-semibold">
                      {prob.percentage}% of data
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-foreground mb-1">{prob.title}</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Occurrences: <strong className="text-foreground">{prob.occurrences.toLocaleString()}</strong> ({prob.negativeMentions} negative mentions)
                  </p>

                  {/* Sample Evidence Quote */}
                  {prob.sampleEvidenceQuotes[0] && (
                    <div className="rounded-lg bg-muted/50 p-2 text-xs italic text-muted-foreground border-l-2 border-brand/50 line-clamp-2">
                      "{prob.sampleEvidenceQuotes[0]}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 3. Interactive Problem Exploration Drilldown ───────────────── */}
        {selectedProblem && (
          <div className="rounded-2xl bg-card ring-1 ring-brand/40 p-6 space-y-6 border-l-4 border-l-brand">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-brand text-white">
                  Interactive Drilldown
                </span>
                <h3 className="font-bold text-base">{selectedProblem.title}</h3>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${SEVERITY_BADGE[selectedProblem.priority]}`}>
                Severity Score: {selectedProblem.severityScore} / 100
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Evidence & Quotes */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <MessageSquare className="size-3.5 text-brand" /> Traceable Verbatim Evidence
                </h4>
                <div className="space-y-2">
                  {selectedProblem.sampleEvidenceQuotes.map((quote, idx) => (
                    <div key={idx} className="rounded-xl bg-muted/40 p-3 text-xs border border-border">
                      <span className="font-bold text-brand mr-1">Quote #{idx + 1}:</span> "{quote}"
                    </div>
                  ))}
                </div>
              </div>

              {/* Solution & Impact Targets */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Zap className="size-3.5 text-brand" /> Recommended Solution & Target Target
                </h4>
                {selectedSolution ? (
                  <div className="rounded-xl bg-brand/5 border border-brand/20 p-4 space-y-3">
                    <h5 className="font-bold text-sm text-foreground">{selectedSolution.solutionTitle}</h5>
                    <ul className="space-y-1.5 text-xs text-muted-foreground">
                      {selectedSolution.actionableSteps.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="size-3.5 text-brand shrink-0 mt-0.5" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs font-semibold">
                      <span className="text-red-500">Baseline: {selectedSolution.currentBaseline}</span>
                      <span className="text-green-500">Target: {selectedSolution.estimatedTarget}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground italic">
                      * {selectedSolution.estimateDisclaimer}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Select a problem to view solution details.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── 4. Root Cause Analysis (Fact vs Hypothesis) ────────────────── */}
        <div className="rounded-2xl bg-card ring-1 ring-border p-6 space-y-4">
          <SectionHeader icon={<Layers className="size-4" />} title="Root Cause Analysis" sub="Fact-supported breakdown of underlying drivers" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {rootCauses.map((rc, idx) => (
              <div key={idx} className="rounded-xl bg-muted/40 p-4 space-y-2 border border-border">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    rc.type === "DATA_OBSERVED" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-purple-500/10 text-purple-500 border border-purple-500/20"
                  }`}>
                    {rc.type === "DATA_OBSERVED" ? "DATA-OBSERVED FACT" : "AI-INFERRED HYPOTHESIS"}
                  </span>
                  <span className="text-xs font-bold text-foreground">{rc.percentage}%</span>
                </div>
                <h4 className="font-bold text-sm">{rc.cause}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{rc.explanation}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 5. Sentiment Summary Charts ──────────────────────────────────── */}
        <div className="rounded-2xl bg-card ring-1 ring-border p-6">
          <SectionHeader icon={<BarChart3 className="size-4" />} title="Sentiment Intelligence Breakdown" sub={`Across ${sentimentSummary.total.toLocaleString()} analyzed records from ${fileName}`} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Positive", count: sentimentSummary.positive, color: SENTIMENT_COLORS.positive, emoji: "😊" },
              { label: "Negative", count: sentimentSummary.negative, color: SENTIMENT_COLORS.negative, emoji: "😞" },
              { label: "Neutral",  count: sentimentSummary.neutral,  color: SENTIMENT_COLORS.neutral,  emoji: "😐" },
              { label: "Mixed",    count: sentimentSummary.mixed,    color: SENTIMENT_COLORS.mixed,    emoji: "🔀" },
            ].map(item => (
              <div key={item.label} className="rounded-xl bg-muted/40 p-4 text-center">
                <div className="text-2xl mb-1">{item.emoji}</div>
                <div className="text-2xl font-bold tabular-nums" style={{ color: item.color }}>
                  {Math.round((item.count / total) * 100)}%
                </div>
                <div className="text-xs text-muted-foreground">{item.label} · {item.count.toLocaleString()}</div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v: unknown) => [`${v} records (${Math.round(((v as number) / total) * 100)}%)`, ""]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="positive" stroke={SENTIMENT_COLORS.positive} strokeWidth={2} dot={false} name="Positive" />
                  <Line type="monotone" dataKey="negative" stroke={SENTIMENT_COLORS.negative} strokeWidth={2} dot={false} name="Negative" />
                  <Line type="monotone" dataKey="neutral"  stroke={SENTIMENT_COLORS.neutral}  strokeWidth={2} dot={false} name="Neutral"  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── 6. Prioritized Action Plan Matrix ────────────────────────────── */}
        {actionPlan.length > 0 && (
          <div className="rounded-2xl bg-card ring-1 ring-border p-6 space-y-4">
            <SectionHeader icon={<ListOrdered className="size-4" />} title="Prioritized Action Plan" sub="Sequenced implementation roadmap" />
            <div className="divide-y divide-border">
              {actionPlan.map(item => (
                <div key={item.stepNumber} className="py-3 flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="flex size-7 items-center justify-center rounded-full bg-brand text-white text-xs font-bold">
                      {item.stepNumber}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{item.action}</h4>
                      <p className="text-xs text-muted-foreground">{item.evidence}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${SEVERITY_BADGE[item.priority]}`}>
                      {item.priority}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-muted text-muted-foreground">
                      Difficulty: {item.difficulty}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* ── 7. Interactive What-If Scenario Simulator ────────────────────── */}
        <WhatIfSimulator discoveredProblems={discoveredProblems} sentimentSummary={sentimentSummary} />
      </motion.div>
    </AnimatePresence>
  );
}

function WhatIfSimulator({
  discoveredProblems,
  sentimentSummary
}: {
  discoveredProblems: DiscoveredProblem[];
  sentimentSummary: { total: number; positive: number; negative: number; neutral: number };
}) {
  const [reductionPercent, setReductionPercent] = useState(25);
  const [selectedProblemIndex, setSelectedProblemIndex] = useState(0);

  const targetProblem = discoveredProblems[selectedProblemIndex] || discoveredProblems[0];
  if (!targetProblem) return null;

  const total = sentimentSummary.total || 1;
  const currentNeg = sentimentSummary.negative;
  const problemNegMentions = targetProblem.negativeMentions || Math.round(targetProblem.occurrences * 0.7);

  // Simulation Math
  const solvedMentions = Math.round(problemNegMentions * (reductionPercent / 100));
  const simulatedNeg = Math.max(0, currentNeg - solvedMentions);
  const simulatedPos = sentimentSummary.positive + solvedMentions;

  const currentPosPercent = Math.round((sentimentSummary.positive / total) * 100);
  const simulatedPosPercent = Math.round((simulatedPos / total) * 100);
  const improvementPoints = simulatedPosPercent - currentPosPercent;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-card via-card to-brand/5 ring-1 ring-border p-6 space-y-4">
      <SectionHeader
        icon={<Zap className="size-4 text-brand" />}
        title="What-If Scenario Simulator"
        sub="Test hypothetical problem resolution scenarios and estimate potential overall sentiment improvement"
      />

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">
              Select Problem to Simulate:
            </label>
            <select
              value={selectedProblemIndex}
              onChange={e => setSelectedProblemIndex(Number(e.target.value))}
              className="w-full rounded-xl bg-muted/50 border border-border p-2.5 text-sm font-semibold text-foreground focus:ring-2 focus:ring-brand outline-none"
            >
              {discoveredProblems.map((prob, i) => (
                <option key={prob.id} value={i}>
                  {prob.title} ({prob.negativeMentions} negative mentions)
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-bold mb-1">
              <span className="text-muted-foreground uppercase tracking-wider">Hypothetical Reduction:</span>
              <span className="text-brand text-sm">{reductionPercent}% reduction</span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              step={5}
              value={reductionPercent}
              onChange={e => setReductionPercent(Number(e.target.value))}
              className="w-full accent-brand cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>5% (Minor fix)</span>
              <span>50% (Major operational fix)</span>
              <span>100% (Complete elimination)</span>
            </div>
          </div>
        </div>

        {/* Simulation Output Card */}
        <div className="rounded-xl bg-brand/10 border border-brand/20 p-4 space-y-3 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand px-2 py-0.5 rounded-full bg-brand/20">
              SIMULATED SCENARIO RESULT
            </span>
            <h4 className="font-bold text-sm mt-2">
              If <strong className="text-brand">{targetProblem.title}</strong> complaints decrease by {reductionPercent}%:
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg bg-card p-3 border border-border">
              <div className="text-xs text-muted-foreground">Current Positive %</div>
              <div className="text-xl font-bold text-foreground tabular-nums">{currentPosPercent}%</div>
            </div>
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3">
              <div className="text-xs text-emerald-600 font-bold">Simulated Target</div>
              <div className="text-xl font-bold text-emerald-500 tabular-nums">
                {simulatedPosPercent}% <span className="text-xs font-semibold">(+{improvementPoints}%)</span>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground italic border-t border-border/50 pt-2">
            ⚠️ SIMULATED ESTIMATE — Not a guaranteed forecast. Calculated by assuming {solvedMentions.toLocaleString()} negative mentions shift to resolved feedback.
          </p>
        </div>
      </div>
    </div>
  );
}

