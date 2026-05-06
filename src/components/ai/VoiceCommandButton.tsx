"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Loader2, X, CheckCircle, XCircle, Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface ProposedAction {
  type: string;
  description: string;
  sensitive: boolean;
}

interface CommandResult {
  transcript?: string;
  intent?: string;
  confidence?: number;
  userFacingSummary?: string;
  requiresConfirmation?: boolean;
  commandId?: string;
  proposedActions?: ProposedAction[];
  error?: string;
}

type Phase = "idle" | "recording" | "processing" | "result" | "confirm";

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }> & { isFinal: boolean }>;
};
type SpeechRecognitionErrorEventLike = { error: string };
interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export default function VoiceCommandButton() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<CommandResult | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTranscriptRef = useRef<string>("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (phase === "recording") {
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  function close() {
    setPhase("idle");
    setResult(null);
    setSeconds(0);
    setInterimText("");
  }

  function startRecording() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      toast.error("הדפדפן הזה לא תומך בזיהוי דיבור — נסה Chrome או Edge");
      return;
    }
    try {
      const rec = new Ctor();
      rec.lang = "he-IL";
      rec.interimResults = true;
      rec.continuous = true;
      rec.maxAlternatives = 1;
      finalTranscriptRef.current = "";
      setInterimText("");

      rec.onresult = (event) => {
        let interim = "";
        let final = "";
        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          const transcript = res[0]?.transcript ?? "";
          if (res.isFinal) final += transcript;
          else interim += transcript;
        }
        if (final) finalTranscriptRef.current += final;
        setInterimText(interim);
      };

      rec.onerror = (e) => {
        if (e.error === "no-speech") {
          toast.info("לא זוהה דיבור — נסה שוב");
        } else if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          toast.error("גישה למיקרופון נדחתה — אפשר גישה בהגדרות הדפדפן");
        } else {
          toast.error(`שגיאה בזיהוי דיבור: ${e.error}`);
        }
        setPhase("idle");
      };

      rec.onend = () => {
        const transcript = (finalTranscriptRef.current + interimText).trim();
        if (!transcript) {
          setPhase("idle");
          return;
        }
        sendText(transcript);
      };

      rec.start();
      recognitionRef.current = rec;
      setPhase("recording");
    } catch {
      toast.error("לא הצליח להפעיל את המיקרופון");
      setPhase("idle");
    }
  }

  function stopRecording() {
    recognitionRef.current?.stop();
    setPhase("processing");
  }

  async function sendText(transcript: string) {
    setPhase("processing");
    try {
      const res = await fetch("/api/ai/text-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: transcript }),
      });
      const data = await res.json();

      if (data.success) {
        const merged = { transcript, ...data.data };
        setResult(merged);
        setPhase(data.data.requiresConfirmation ? "confirm" : "result");
        if (!data.data.requiresConfirmation) {
          toast.success(data.data.userFacingSummary ?? "Done!");
        }
      } else {
        setResult({ transcript, error: data.error ?? "Unknown error" });
        setPhase("result");
        toast.error(data.error ?? "Failed");
      }
    } catch {
      setResult({ transcript, error: "Network error" });
      setPhase("result");
      toast.error("Network error");
    }
  }

  async function confirmAction(confirmed: boolean) {
    if (!confirmed || !result?.commandId) {
      toast.info("הפעולה בוטלה");
      close();
      return;
    }
    setPhase("processing");
    try {
      const res = await fetch("/api/ai/text-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commandId: result.commandId, confirmed: true }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("הפעולה בוצעה בהצלחה ✓");
      } else {
        toast.error(data.error ?? "Failed");
      }
    } catch {
      toast.error("Network error");
    }
    close();
  }

  const isOpen = phase !== "idle";

  return (
    <>
      <button
        onClick={() => phase === "idle" ? startRecording() : (phase === "recording" ? stopRecording() : null)}
        title="פקודה קולית"
        className="relative flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
        style={
          phase === "recording"
            ? { background: "#fef2f2", color: "#dc2626", border: "2px solid #fca5a5" }
            : { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white", boxShadow: "0 2px 10px rgba(99,102,241,0.35)" }
        }
      >
        {phase === "recording" ? (
          <>
            <MicOff className="w-4 h-4" />
            <span>{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</span>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500">
              <span className="absolute inset-0 rounded-full bg-red-400 animate-ping" />
            </span>
          </>
        ) : (
          <>
            <Mic className="w-4 h-4" />
            <span className="hidden sm:inline">קול</span>
          </>
        )}
      </button>

      {isOpen && phase === "recording" && interimText && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-md px-4 py-2 rounded-xl bg-white shadow-lg border border-gray-200 text-sm text-gray-700">
          <span className="opacity-60">שומע: </span>
          <span className="font-medium">{interimText}</span>
        </div>
      )}

      {isOpen && phase !== "recording" && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <div
            className="w-full max-w-md rounded-2xl overflow-hidden"
            style={{ background: "white", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}
          >
            <div className="flex items-center justify-between px-5 py-4"
              style={{ background: "linear-gradient(135deg,#1a1a2e,#16213e)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-bold text-sm">פקודה קולית AI</span>
              </div>
              <button onClick={close} className="text-gray-500 hover:text-white transition p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              {phase === "processing" && (
                <div className="flex flex-col items-center py-8 gap-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,#eef2ff,#f5f3ff)" }}>
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#6366f1" }} />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-gray-900">מעבד...</p>
                    <p className="text-sm text-gray-400 mt-1">ה-AI מנתח את הפקודה</p>
                  </div>
                </div>
              )}

              {phase === "result" && result && (
                <div className="space-y-4">
                  {result.transcript && (
                    <div className="p-3 rounded-xl" style={{ background: "#f8f9fc" }}>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">אמרת</p>
                      <p className="text-sm font-semibold text-gray-800 italic">&quot;{result.transcript}&quot;</p>
                    </div>
                  )}

                  {result.error ? (
                    <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
                      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-red-800 text-sm">הפקודה נכשלה</p>
                        <p className="text-xs text-red-600 mt-0.5">{result.error}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-emerald-800 text-sm">בוצע ✓</p>
                        <p className="text-xs text-emerald-700 mt-0.5">{result.userFacingSummary}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button onClick={startRecording}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
                      style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                      <Mic className="w-4 h-4" /> הקלט שוב
                    </button>
                    <button onClick={close}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold border-2 border-gray-200 text-gray-600 hover:border-gray-300 transition">
                      סגור
                    </button>
                  </div>
                </div>
              )}

              {phase === "confirm" && result && (
                <div className="space-y-4">
                  {result.transcript && (
                    <div className="p-3 rounded-xl" style={{ background: "#f8f9fc" }}>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">אמרת</p>
                      <p className="text-sm font-semibold text-gray-800 italic">&quot;{result.transcript}&quot;</p>
                    </div>
                  )}

                  <div className="p-4 rounded-xl" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <p className="font-bold text-amber-800 text-sm">אישור פעולות</p>
                    </div>
                    <div className="space-y-1.5">
                      {result.proposedActions?.map((action, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-amber-400 mt-0.5 flex-shrink-0">→</span>
                          <p className="text-xs text-amber-800 font-medium">{action.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => confirmAction(true)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
                      style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}>
                      <CheckCircle className="w-4 h-4" /> אשר
                    </button>
                    <button onClick={() => confirmAction(false)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
                      style={{ background: "linear-gradient(135deg,#ef4444,#dc2626)" }}>
                      <XCircle className="w-4 h-4" /> בטל
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
