"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Mic, MicOff, Send, Loader2, CheckCircle, XCircle, Sparkles, AlertTriangle, Volume2 } from "lucide-react";

interface ProposedAction {
  type: string;
  description: string;
  data: Record<string, unknown>;
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
  result?: { success: boolean; data?: unknown; warnings?: string[] };
  error?: string;
}

interface CommandHistory {
  id: string;
  type: "voice" | "text";
  input: string;
  result: CommandResult;
  timestamp: Date;
  status: "pending" | "executed" | "confirmed" | "failed" | "cancelled";
}

export default function AIAssistantClient() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [history, setHistory] = useState<CommandHistory[]>([]);
  const [pendingCommand, setPendingCommand] = useState<CommandHistory | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const textRef = useRef<HTMLTextAreaElement>(null);

  async function sendText() {
    if (!text.trim() || loading) return;
    const inputText = text.trim();
    setText("");
    setLoading(true);

    const entry: CommandHistory = {
      id: Date.now().toString(),
      type: "text",
      input: inputText,
      result: {},
      timestamp: new Date(),
      status: "pending",
    };
    setHistory((h) => [entry, ...h]);

    try {
      const res = await fetch("/api/ai/text-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText }),
      });
      const data = await res.json();

      if (data.success) {
        const updatedEntry = { ...entry, result: data.data };
        if (data.data.requiresConfirmation) {
          updatedEntry.status = "pending";
          setPendingCommand(updatedEntry);
        } else {
          updatedEntry.status = "executed";
          toast.success(data.data.userFacingSummary ?? "Done!");
        }
        setHistory((h) => h.map((e) => e.id === entry.id ? updatedEntry : e));
      } else {
        setHistory((h) => h.map((e) => e.id === entry.id ? { ...e, status: "failed", result: { error: data.error } } : e));
        toast.error(data.error ?? "Failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await sendVoice(blob);
      };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setRecording(true);
    } catch (error) {
      toast.error("Microphone access denied");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function sendVoice(audioBlob: Blob) {
    setLoading(true);
    const entry: CommandHistory = {
      id: Date.now().toString(),
      type: "voice",
      input: "🎙️ Voice recording...",
      result: {},
      timestamp: new Date(),
      status: "pending",
    };
    setHistory((h) => [entry, ...h]);

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "audio.webm");
      const res = await fetch("/api/ai/voice-command", { method: "POST", body: formData });
      const data = await res.json();

      if (data.success) {
        const updatedEntry = { ...entry, input: data.data.transcript ?? "Voice command", result: data.data };
        if (data.data.requiresConfirmation) {
          updatedEntry.status = "pending";
          setPendingCommand(updatedEntry);
        } else {
          updatedEntry.status = "executed";
          toast.success(data.data.userFacingSummary ?? "Done!");
        }
        setHistory((h) => h.map((e) => e.id === entry.id ? updatedEntry : e));
      } else {
        setHistory((h) => h.map((e) => e.id === entry.id ? { ...e, status: "failed", result: { error: data.error } } : e));
        toast.error(data.error ?? "Failed");
      }
    } catch {
      toast.error("Error sending voice command");
    } finally {
      setLoading(false);
    }
  }

  async function confirmCommand(commandId: string, confirmed: boolean) {
    if (!confirmed) {
      setPendingCommand(null);
      setHistory((h) => h.map((e) => e.result.commandId === commandId ? { ...e, status: "cancelled" } : e));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/ai/text-command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commandId, confirmed: true }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Action executed!");
        setHistory((h) => h.map((e) => e.result.commandId === commandId ? { ...e, status: "executed" } : e));
      } else {
        toast.error(data.error ?? "Failed");
      }
    } finally {
      setLoading(false);
      setPendingCommand(null);
    }
  }

  const examples = [
    "Add new lead: Daniel Cohen from Alpha Ventures, potential $250,000, interested in Web3",
    "Update Yossi Levy - he committed $20,000, needs to talk to his partner tomorrow",
    "Create a task to send deck to David tomorrow at 10am",
    "Which are my hottest leads this week?",
    "Move Alpha Ventures to Due Diligence stage",
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Intro */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">AI Sales Assistant</h2>
            <p className="text-sm text-gray-500">Type or speak your command in Hebrew or English</p>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          I can create leads, update records, create tasks, schedule follow-ups, and give you insights on your pipeline.
          For sensitive actions I'll ask for confirmation first.
        </p>
      </div>

      {/* Input */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <textarea
          ref={textRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a command... e.g. 'Add new lead: Daniel Cohen from Alpha Ventures'"
          rows={3}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) sendText(); }}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={recording ? stopRecording : startRecording}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${recording ? "bg-red-500 text-white animate-pulse" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
          >
            {recording ? <><MicOff className="w-4 h-4" /> Stop Recording</> : <><Mic className="w-4 h-4" /> Record</>}
          </button>
          <button
            onClick={sendText}
            disabled={!text.trim() || loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-40 ml-auto"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send
          </button>
        </div>
        <p className="text-xs text-gray-400">Tip: Press ⌘+Enter to send</p>
      </div>

      {/* Confirmation Dialog */}
      {pendingCommand && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900">Confirmation Required</h3>
              <p className="text-sm text-amber-700 mt-1">{pendingCommand.result.userFacingSummary}</p>
            </div>
          </div>

          {pendingCommand.result.proposedActions && pendingCommand.result.proposedActions.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-amber-700">Actions to execute:</p>
              {pendingCommand.result.proposedActions.map((action, i) => (
                <div key={i} className={`flex items-center gap-2 text-xs p-2 rounded-lg ${action.sensitive ? "bg-red-50 text-red-700" : "bg-white text-gray-700"}`}>
                  {action.sensitive ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3 text-green-500" />}
                  {action.description}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => confirmCommand(pendingCommand.result.commandId!, true)}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Confirm & Execute
            </button>
            <button
              onClick={() => confirmCommand(pendingCommand.result.commandId!, false)}
              className="px-4 py-2 border border-gray-200 text-sm rounded-xl hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Examples */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Example commands</h3>
        <div className="space-y-1.5">
          {examples.map((ex, i) => (
            <button
              key={i}
              onClick={() => { setText(ex); textRef.current?.focus(); }}
              className="w-full text-left text-xs text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-lg transition"
            >
              "{ex}"
            </button>
          ))}
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Command History</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {history.map((cmd) => (
              <div key={cmd.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {cmd.type === "voice" ? (
                      <Volume2 className="w-4 h-4 text-purple-500" />
                    ) : (
                      <Send className="w-4 h-4 text-indigo-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 font-medium">{cmd.input}</p>
                    {cmd.result.transcript && cmd.result.transcript !== cmd.input && (
                      <p className="text-xs text-gray-400 mt-0.5">Transcript: {cmd.result.transcript}</p>
                    )}
                    {cmd.result.userFacingSummary && (
                      <p className="text-xs text-gray-500 mt-1">{cmd.result.userFacingSummary}</p>
                    )}
                    {cmd.result.error && (
                      <p className="text-xs text-red-500 mt-1">{cmd.result.error}</p>
                    )}
                    {cmd.result.confidence != null && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Confidence: {Math.round(cmd.result.confidence * 100)}% • Intent: {cmd.result.intent}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {cmd.status === "executed" && <CheckCircle className="w-4 h-4 text-green-500" />}
                    {cmd.status === "failed" && <XCircle className="w-4 h-4 text-red-500" />}
                    {cmd.status === "cancelled" && <XCircle className="w-4 h-4 text-gray-400" />}
                    {cmd.status === "pending" && <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
