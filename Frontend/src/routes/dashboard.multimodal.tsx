import { createFileRoute } from "@tanstack/react-router";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { useState } from "react";
import { Mic, Sparkles, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { VoiceRecorderCard } from "@/components/VoiceRecorderCard";
import { MultimodalEmotionView, type MultimodalResultPayload } from "@/components/MultimodalEmotionView";
import { pushActivity } from "@/lib/activity-store";

export const Route = createFileRoute("/dashboard/multimodal")({
  component: MultimodalPage,
});

const BASE_URL = typeof window !== "undefined"
  ? (import.meta.env?.VITE_API_URL ?? "http://localhost:5001")
  : "http://localhost:5001";

function MultimodalPage() {
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [textInput, setTextInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MultimodalResultPayload | null>(null);

  const resetAll = () => {
    setAudioBlob(null);
    setTextInput("");
    setResults(null);
  };

  const handleAnalyze = async () => {
    if (!audioBlob && !textInput.trim()) {
      toast.error("Please record audio or enter text to analyze.");
      return;
    }

    setLoading(true);
    toast.loading("Analyzing multimodal voice & text emotion signals...", { id: "multi" });

    try {
      const token = localStorage.getItem("ai_sentiment_token");
      const formData = new FormData();
      if (textInput.trim()) formData.append("text", textInput.trim());
      if (audioBlob) formData.append("audio", audioBlob, "recorded_voice.webm");

      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${BASE_URL}/api/multimodal/analyze`, {
        method: "POST",
        headers,
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.message || "Multimodal analysis failed");
      }

      setResults(json.data);
      toast.success("Multimodal Emotion Intelligence complete!", { id: "multi" });
      pushActivity({
        kind: "analysis",
        title: "Multimodal Voice & Text Analysis",
        detail: audioBlob ? "Voice recording + Text analysis" : "Text emotion analysis",
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to analyze multimodal input.", { id: "multi" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <DashboardTopbar title="Voice & Text Intelligence" />
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Mic className="size-6 text-brand" /> Voice & Text Emotion Intelligence
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Analyze emotional indicators, Speech-to-Text, and acoustic signals from voice recordings and text feedback.
            </p>
          </div>
          {results && (
            <button
              onClick={resetAll}
              className="flex items-center gap-2 rounded-xl ring-1 ring-border px-3 py-1.5 text-xs hover:bg-muted transition-all"
            >
              <RefreshCw className="size-3" /> Reset
            </button>
          )}
        </div>

        {/* Voice & Text Input Card */}
        <VoiceRecorderCard
          onAudioRecorded={setAudioBlob}
          textInput={textInput}
          onTextInputChange={setTextInput}
        />

        {/* Submit Analyze Button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={loading || (!audioBlob && !textInput.trim())}
            className="flex items-center gap-2 bg-brand text-white text-sm font-semibold px-6 py-3 rounded-xl shadow-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Analyze Emotion & Sentiment
          </button>
        </div>

        {/* Results View */}
        {results && <MultimodalEmotionView results={results} />}
      </main>
    </div>
  );
}
