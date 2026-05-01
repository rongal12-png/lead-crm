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

export default function VoiceCommandButton() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<CommandResult | null>(null);
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
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
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        await sendVoice(new Blob(chunksRef.current, { type: "audio/webm" }));
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setPhase("recording");
    } catch {
      toast.error("Microphone access denied");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setPhase("processing");
  }

  async function sendVoice(blob: Blob) {
    setPhase("processing");
    try {
      const fd = new FormData();
      fd.append("audio", blob, "audio.webm");
      const res = await fetch("/api/ai/voice-command", { method: "POST", body: fd });
      const data = await res.json();

      if (data.success) {
        setResult(data.data);
        setPhase(data.data.requiresConfirmation ? "confirm" : "result");
        if (!data.data.requiresConfirmation) {
          toast.success(data.data.userFacingSummary ?? "Done!");
        }
      } else {
        setResult({ error: data.error ?? "Unknown error" });
        setPhase("result");
        toast.error(data.error ?? "Failed");
      }
    } catch {
      setResult({ error: "Network error" });
      setPhase("result");
      toast.error("Network error");
    }
  }

  async function confirmAction(confirmed: boolean) {
    if (!confirmed || !result?.commandId) {
      toast.info("Action cancelled");
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
        toast.success("Action executed! ✓");
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
      {/* Trigger button */}
      <button
        onClick={() => phase === "idle" ? startRecording() : (phase === "recording" ? stopRecording() : null)}
        title="Voice Command (Hebrew / English)"
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
            {/* Pulse ring */}
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500">
              <span className="absolute inset-0 rounded-full bg-red-400 animate-ping" />
            </span>
          </>
        ) : (
          <>
            <Mic className="w-4 h-4" />
            <span className="hidden sm:inline">Voice</span>
          </>
        )}
      </button>

      {/* Modal overlay */}
      {isOpen && phase !== "recording" && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <div
            className="w-full max-w-md rounded-2xl overflow-hidden"
            style={{ background: "white", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4"
              style={{ background: "linear-gradient(135deg,#1a1a2e,#16213e)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-bold text-sm">AI Voice Command</span>
              </div>
              <button onClick={close} className="text-gray-500 hover:text-white transition p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              {/* Processing */}
              {phase === "processing" && (
                <div className="flex flex-col items-center py-8 gap-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,#eef2ff,#f5f3ff)" }}>
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#6366f1" }} />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-gray-900">Processing...</p>
                    <p className="text-sm text-gray-400 mt-1">AI is analyzing your command</p>
                  </div>
                </div>
              )}

              {/* Result */}
              {phase === "result" && result && (
                <div className="space-y-4">
                  {result.transcript && (
                    <div className="p-3 rounded-xl" style={{ background: "#f8f9fc" }}>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">You said</p>
                      <p className="text-sm font-semibold text-gray-800 italic">"{result.transcript}"</p>
                    </div>
                  )}

                  {result.error ? (
                    <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
                      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-red-800 text-sm">Command failed</p>
                        <p className="text-xs text-red-600 mt-0.5">{result.error}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-emerald-800 text-sm">Executed</p>
                        <p className="text-xs text-emerald-700 mt-0.5">{result.userFacingSummary}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button onClick={startRecording}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
                      style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                      <Mic className="w-4 h-4" /> Record again
                    </button>
                    <button onClick={close}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold border-2 border-gray-200 text-gray-600 hover:border-gray-300 transition">
                      Close
                    </button>
                  </div>
                </div>
              )}

              {/* Confirm */}
              {phase === "confirm" && result && (
                <div className="space-y-4">
                  {result.transcript && (
                    <div className="p-3 rounded-xl" style={{ background: "#f8f9fc" }}>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">You said</p>
                      <p className="text-sm font-semibold text-gray-800 italic">"{result.transcript}"</p>
                    </div>
                  )}

                  <div className="p-4 rounded-xl" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <p className="font-bold text-amber-800 text-sm">Confirm these actions</p>
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
                      <CheckCircle className="w-4 h-4" /> Confirm
                    </button>
                    <button onClick={() => confirmAction(false)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
                      style={{ background: "linear-gradient(135deg,#ef4444,#dc2626)" }}>
                      <XCircle className="w-4 h-4" /> Cancel
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
