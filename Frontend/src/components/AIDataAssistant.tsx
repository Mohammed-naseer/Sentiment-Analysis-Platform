import { motion, AnimatePresence } from "framer-motion";
import { Brain, Sparkles, ChevronRight, CheckCircle2, AlertCircle, Info, Zap, TrendingUp, ShoppingBag, Star, Search, AlertTriangle } from "lucide-react";
import type { RecommendedAnalysis, DatasetProfile } from "@/lib/dataset-api";

interface AIDataAssistantProps {
  profile: DatasetProfile;
  recommendations: RecommendedAnalysis[];
  onAnalyzeRecommended: () => void;
  onCustomize: () => void;
  isAnalyzing: boolean;
}

const ANALYSIS_ICONS: Record<string, React.ReactNode> = {
  sentiment_analysis:  <Sparkles className="size-4" />,
  emotion_analysis:    <Brain className="size-4" />,
  aspect_analysis:     <Search className="size-4" />,
  sentiment_trends:    <TrendingUp className="size-4" />,
  emerging_issues:     <AlertTriangle className="size-4" />,
  product_comparison:  <ShoppingBag className="size-4" />,
  rating_analysis:     <Star className="size-4" />,
  root_cause_analysis: <Zap className="size-4" />,
  volume_trends:       <TrendingUp className="size-4" />,
};

const PRIORITY_STYLE: Record<string, string> = {
  High:   "bg-red-500/10 text-red-500 border-red-500/20",
  Medium: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  Low:    "bg-muted text-muted-foreground border-border",
};

function CapabilityBadge({ label, found }: { label: string; found: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs rounded-full px-3 py-1 border ${
      found
        ? "bg-success/10 text-success border-success/20"
        : "bg-muted text-muted-foreground border-border"
    }`}>
      {found ? <CheckCircle2 className="size-3" /> : <AlertCircle className="size-3 opacity-40" />}
      {label}
    </div>
  );
}

export function AIDataAssistant({ profile, recommendations, onAnalyzeRecommended, onCustomize, isAnalyzing }: AIDataAssistantProps) {
  const textCols   = profile.columns.filter(c => c.type === "text" || c.semanticRole === "feedback_text");
  const ratingCols = profile.columns.filter(c => c.semanticRole === "rating");
  const dateCols   = profile.columns.filter(c => c.type === "date" || c.semanticRole === "timestamp");
  const prodCols   = profile.columns.filter(c => c.semanticRole === "product_category" || c.type === "categorical");

  const applicable  = recommendations.filter(r => r.applicable);
  const highPrio    = applicable.filter(r => r.priority === "High");
  const hasText     = textCols.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden ring-1 ring-brand/30 bg-gradient-to-br from-brand/5 via-card to-cyan-500/5"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-brand/10 bg-gradient-to-r from-brand/10 to-cyan-500/10">
        <div className="relative">
          <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-cyan-500 shadow-lg shadow-brand/25">
            <Brain className="size-5 text-white" />
          </div>
          <span className="absolute -top-1 -right-1 size-3 rounded-full bg-success border-2 border-card animate-pulse" />
        </div>
        <div>
          <h3 className="font-bold text-sm tracking-tight">AI Data Assistant</h3>
          <p className="text-xs text-muted-foreground">Intelligence powered by Gemini + Groq + HuggingFace</p>
        </div>
        <div className="ml-auto text-xs text-muted-foreground bg-muted rounded-full px-3 py-1">
          {profile.totalRows.toLocaleString()} rows analyzed
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Dataset Understanding */}
        <div>
          <p className="text-sm font-semibold mb-3 text-foreground/80">I've analyzed your dataset. I found:</p>
          <div className="flex flex-wrap gap-2">
            <CapabilityBadge label="Customer Feedback Text" found={hasText} />
            <CapabilityBadge label="Ratings / Scores" found={ratingCols.length > 0} />
            <CapabilityBadge label="Date / Timestamp" found={dateCols.length > 0} />
            <CapabilityBadge label="Product / Category" found={prodCols.length > 0} />
          </div>
        </div>

        {/* AI Semantic Insight */}
        <div className="rounded-xl bg-brand/5 border border-brand/10 px-4 py-3 flex gap-3">
          <Info className="size-4 text-brand mt-0.5 shrink-0" />
          <p className="text-sm leading-relaxed text-foreground/80">
            {profile.semanticSummary || `This dataset contains ${profile.totalRows.toLocaleString()} records across ${profile.totalColumns} fields.`}
          </p>
        </div>

        {/* Recommendations */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Recommended Analyses</p>
            <span className="text-xs text-muted-foreground">{applicable.length} applicable</span>
          </div>

          <div className="space-y-2">
            <AnimatePresence>
              {recommendations.map((rec, i) => (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={`rounded-xl border p-3.5 transition-all ${
                    rec.applicable
                      ? "bg-card hover:bg-muted/40 cursor-default"
                      : "bg-muted/30 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex size-8 items-center justify-center rounded-lg ${
                      rec.applicable ? "bg-brand/10 text-brand" : "bg-muted text-muted-foreground"
                    }`}>
                      {ANALYSIS_ICONS[rec.id] ?? <Sparkles className="size-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{rec.name}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider rounded-full border px-2 py-0.5 ${PRIORITY_STYLE[rec.priority]}`}>
                          {rec.priority}
                        </span>
                        {!rec.applicable && (
                          <span className="text-[10px] font-semibold text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                            Not Applicable
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{rec.description}</p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                  </div>
                  {/* Why explanation */}
                  <div className="mt-2 ml-11 text-[11px] text-muted-foreground/80 italic">
                    💡 {rec.why}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Non-text dataset advisory */}
        {!hasText && (
          <div className="rounded-xl bg-warning/10 border border-warning/20 p-4 flex gap-3">
            <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-warning">Sentiment Analysis Not Recommended</p>
              <p className="text-xs text-muted-foreground mt-1">
                This dataset does not contain a suitable textual feedback column. Sentiment analysis may not produce meaningful results.
                Available analyses focus on numeric and categorical data.
              </p>
            </div>
          </div>
        )}

        {/* CTA Buttons */}
        <div className="flex gap-3 pt-1">
          <button
            id="analyze-recommended-btn"
            onClick={onAnalyzeRecommended}
            disabled={isAnalyzing || applicable.length === 0}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-cyan-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-brand/25 hover:shadow-brand/40 hover:scale-[1.02] active:scale-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isAnalyzing ? (
              <>
                <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <Zap className="size-4" />
                Analyze Recommended ({highPrio.length} High Priority)
              </>
            )}
          </button>
          <button
            id="customize-analysis-btn"
            onClick={onCustomize}
            disabled={isAnalyzing}
            className="rounded-xl ring-1 ring-border px-4 py-3 text-sm font-semibold hover:bg-muted transition-all disabled:opacity-50"
          >
            Customize
          </button>
        </div>
      </div>
    </motion.div>
  );
}
