import { useState, useRef, useEffect } from "react";
import { Mic, Square, Play, Pause, Trash2, CheckCircle2, AlertCircle, Volume2, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceRecorderCardProps {
  onAudioRecorded: (blob: Blob | null) => void;
  textInput: string;
  onTextInputChange: (val: string) => void;
}

export function VoiceRecorderCard({
  onAudioRecorded,
  textInput,
  onTextInputChange,
}: VoiceRecorderCardProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [consentGiven, setConsentGiven] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        onAudioRecorded(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert("Microphone access is required to record audio.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const deleteRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setRecordingTime(0);
    onAudioRecorded(null);
  };

  const togglePlay = () => {
    if (!audioPlayerRef.current || !audioUrl) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="rounded-2xl bg-card ring-1 ring-border p-6 space-y-6">
      {/* Privacy & Consent Banner */}
      <div className="rounded-xl bg-brand/10 border border-brand/20 p-3 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-brand font-semibold">
          <ShieldCheck className="size-4 shrink-0" />
          <span>Privacy Notice: Your voice recording is processed securely in-memory to generate transcripts and non-diagnostic emotion indicators.</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Voice Recorder Controls */}
        <div className="space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Mic className="size-4 text-brand" /> Voice Input (Microphone)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Record customer feedback or verbal responses for speech-to-text & acoustic indicator analysis.
            </p>
          </div>

          <div className="rounded-xl bg-muted/40 p-6 flex flex-col items-center justify-center gap-4 text-center border border-border">
            {!isRecording && !audioUrl && (
              <button
                type="button"
                onClick={startRecording}
                className="flex items-center gap-2 bg-brand text-white text-sm font-semibold px-6 py-3 rounded-full shadow-lg hover:opacity-90 transition-all"
              >
                <Mic className="size-5" /> Start Recording
              </button>
            )}

            {isRecording && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-red-500 font-mono text-lg font-bold animate-pulse">
                  <span className="size-3 rounded-full bg-red-500" />
                  Recording: {formatTimer(recordingTime)}
                </div>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center gap-2 bg-red-600 text-white text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-red-700 transition-all"
                >
                  <Square className="size-4" /> Stop Recording
                </button>
              </div>
            )}

            {audioUrl && !isRecording && (
              <div className="w-full space-y-3">
                <audio
                  ref={audioPlayerRef}
                  src={audioUrl}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="flex items-center gap-2 bg-brand text-white text-xs font-semibold px-4 py-2 rounded-lg"
                  >
                    {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
                    {isPlaying ? "Pause" : "Play Audio Preview"}
                  </button>
                  <button
                    type="button"
                    onClick={deleteRecording}
                    className="flex items-center gap-1.5 text-xs text-danger ring-1 ring-danger/30 px-3 py-2 rounded-lg hover:bg-danger/10"
                  >
                    <Trash2 className="size-3.5" /> Delete
                  </button>
                </div>
                <span className="text-[11px] text-success font-semibold flex items-center justify-center gap-1">
                  <CheckCircle2 className="size-3.5" /> Audio Ready ({formatTimer(recordingTime)})
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Text Input Complement */}
        <div className="space-y-3">
          <label className="font-bold text-sm block">
            Text Input (Optional / Transcript Complement)
          </label>
          <textarea
            value={textInput}
            onChange={(e) => onTextInputChange(e.target.value)}
            placeholder="Type or paste feedback text here to perform text analysis or complement voice recording..."
            rows={6}
            className="w-full rounded-xl bg-muted/40 border border-border p-3 text-sm focus:ring-2 focus:ring-brand outline-none resize-none"
          />
        </div>
      </div>
    </div>
  );
}
