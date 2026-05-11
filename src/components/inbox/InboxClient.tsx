"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Send,
  Plus,
  Loader2,
  Inbox as InboxIcon,
  MessageSquare,
  Search,
  X,
} from "lucide-react";
import { getInitials } from "@/lib/utils";

interface UserOption {
  id: string;
  name: string;
  email: string;
}

interface ConversationListItem {
  id: string;
  updatedAt: string;
  otherParticipants: { id: string; name: string; email: string }[];
  unreadCount: number;
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
    senderId: string;
    fromMe: boolean;
  } | null;
}

interface ThreadMessage {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  fromMe: boolean;
}

interface ThreadData {
  id: string;
  participants: { id: string; name: string; email: string }[];
  messages: ThreadMessage[];
}

interface Props {
  currentUserId: string;
  currentUserName: string;
  users: UserOption[];
}

function fmtTime(s: string): string {
  const d = new Date(s);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "אתמול";
  return d.toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}

function fmtFullTime(s: string): string {
  return new Date(s).toLocaleString("he-IL");
}

export default function InboxClient({ currentUserId, currentUserName, users }: Props) {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadData | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const lastMessageTsRef = useRef<string>("");

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/inbox");
      const json = await res.json();
      if (res.ok) setConversations(json.data);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadThread = useCallback(
    async (id: string, opts: { silent?: boolean } = {}) => {
      if (!opts.silent) setLoadingThread(true);
      try {
        const res = await fetch(`/api/inbox/${id}`);
        const json = await res.json();
        if (res.ok) {
          setThread(json.data);
          if (json.data.messages.length > 0) {
            lastMessageTsRef.current =
              json.data.messages[json.data.messages.length - 1].createdAt;
          }
          await fetch(`/api/inbox/${id}/read`, { method: "POST" });
          setConversations((cs) =>
            cs.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
          );
        } else {
          toast.error(json.error ?? "טעינת שיחה נכשלה");
        }
      } finally {
        if (!opts.silent) setLoadingThread(false);
      }
    },
    []
  );

  const pollThread = useCallback(async () => {
    if (!selectedId || !thread) return;
    const since = lastMessageTsRef.current;
    if (!since) return;
    try {
      const res = await fetch(`/api/inbox/${selectedId}?since=${encodeURIComponent(since)}`);
      const json = await res.json();
      if (res.ok && json.data.messages.length > 0) {
        setThread((t) => {
          if (!t) return t;
          const existing = new Set(t.messages.map((m) => m.id));
          const merged = [...t.messages];
          for (const m of json.data.messages as ThreadMessage[]) {
            if (!existing.has(m.id)) merged.push(m);
          }
          return { ...t, messages: merged };
        });
        lastMessageTsRef.current = json.data.messages[json.data.messages.length - 1].createdAt;
        await fetch(`/api/inbox/${selectedId}/read`, { method: "POST" });
        await loadConversations();
      }
    } catch {
      // silent
    }
  }, [selectedId, thread, loadConversations]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const interval = setInterval(loadConversations, 20000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedId) return;
    const interval = setInterval(pollThread, 8000);
    return () => clearInterval(interval);
  }, [selectedId, pollThread]);

  useEffect(() => {
    if (threadEndRef.current) {
      threadEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [thread?.messages.length]);

  function selectConversation(id: string) {
    setSelectedId(id);
    setThread(null);
    setDraft("");
    lastMessageTsRef.current = "";
    loadThread(id);
  }

  async function startConversation(userId: string) {
    setShowNewModal(false);
    setUserSearch("");
    try {
      const res = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "פתיחת שיחה נכשלה");
        return;
      }
      await loadConversations();
      selectConversation(json.data.id);
    } catch {
      toast.error("שגיאת רשת");
    }
  }

  async function send() {
    const content = draft.trim();
    if (!content || !selectedId || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/inbox/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const json = await res.json();
      if (!res.ok || !json.data) {
        toast.error(json.error ?? "שליחה נכשלה");
        return;
      }
      setThread((t) => (t ? { ...t, messages: [...t.messages, json.data] } : t));
      lastMessageTsRef.current = json.data.createdAt;
      setDraft("");
      loadConversations();
    } catch {
      toast.error("שגיאת רשת");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const filteredUsers = userSearch
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
          u.email.toLowerCase().includes(userSearch.toLowerCase())
      )
    : users;

  return (
    <div dir="rtl" className="h-[calc(100vh-140px)] flex gap-4">
      <div className="w-80 flex-shrink-0 bg-white rounded-2xl border border-gray-100 flex flex-col overflow-hidden"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-black text-gray-900 text-sm">שיחות</h3>
            <p className="text-[11px] text-gray-400">{conversations.length} פעילות</p>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white rounded-lg hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
          >
            <Plus className="w-3.5 h-3.5" /> חדשה
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12 px-4">
              <InboxIcon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-bold text-gray-500">אין שיחות עדיין</p>
              <p className="text-xs text-gray-400 mt-1">לחץ "חדשה" כדי להתחיל</p>
            </div>
          ) : (
            conversations.map((c) => {
              const other = c.otherParticipants[0];
              const isSelected = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  onClick={() => selectConversation(c.id)}
                  className={`w-full text-right px-4 py-3 border-b border-gray-50 last:border-0 transition flex items-start gap-3 ${
                    isSelected ? "bg-indigo-50" : "hover:bg-gray-50"
                  }`}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
                  >
                    {getInitials(other?.name ?? "?")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-sm text-gray-900 truncate">
                        {other?.name ?? "(unknown)"}
                      </p>
                      {c.lastMessage && (
                        <span className="text-[10px] text-gray-400 flex-shrink-0">
                          {fmtTime(c.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-xs text-gray-500 truncate flex-1">
                        {c.lastMessage
                          ? `${c.lastMessage.fromMe ? "את/ה: " : ""}${c.lastMessage.content}`
                          : <em className="text-gray-300">אין הודעות</em>}
                      </p>
                      {c.unreadCount > 0 && (
                        <span className="flex-shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full bg-red-500 text-white">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="flex-1 bg-white rounded-2xl border border-gray-100 flex flex-col overflow-hidden"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        {!selectedId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <MessageSquare className="w-12 h-12 mb-3 text-gray-200" />
            <p className="text-sm font-bold">בחר שיחה כדי להתחיל</p>
            <p className="text-xs mt-1">או לחץ "חדשה" כדי לפתוח אחת</p>
          </div>
        ) : !thread || loadingThread ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <>
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
              {(() => {
                const other = thread.participants.find((p) => p.id !== currentUserId);
                return (
                  <>
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                      style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
                    >
                      {getInitials(other?.name ?? "?")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm text-gray-900 truncate">{other?.name}</p>
                      <p className="text-xs text-gray-400 truncate">{other?.email}</p>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-gray-50">
              {thread.messages.length === 0 ? (
                <p className="text-center text-sm text-gray-400 italic py-8">
                  אין הודעות עדיין — שלח את הראשונה
                </p>
              ) : (
                thread.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.fromMe ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        m.fromMe
                          ? "bg-indigo-600 text-white"
                          : "bg-white text-gray-900 border border-gray-100"
                      }`}
                      title={fmtFullTime(m.createdAt)}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.content}</p>
                      <p
                        className={`text-[10px] mt-1 ${
                          m.fromMe ? "text-indigo-200" : "text-gray-400"
                        }`}
                      >
                        {fmtTime(m.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={threadEndRef} />
            </div>

            <div className="border-t border-gray-100 p-3 flex items-end gap-2 bg-white">
              <textarea
                dir="rtl"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="כתוב הודעה... (Enter לשליחה, Shift+Enter לשורה חדשה)"
                className="flex-1 px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 resize-none max-h-32"
                style={{ minHeight: 40 }}
              />
              <button
                onClick={send}
                disabled={!draft.trim() || sending}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold text-white rounded-xl hover:opacity-90 disabled:opacity-60 transition flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                שלח
              </button>
            </div>
          </>
        )}
      </div>

      {showNewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowNewModal(false);
              setUserSearch("");
            }
          }}
        >
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col" dir="rtl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-lg font-black text-gray-900">שיחה חדשה</h3>
              <button
                onClick={() => {
                  setShowNewModal(false);
                  setUserSearch("");
                }}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  autoFocus
                  dir="rtl"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="חיפוש לפי שם או אימייל..."
                  className="w-full pr-9 pl-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <p className="text-center py-8 text-sm text-gray-400 italic">
                  {users.length === 0 ? "אין משתמשים אחרים במערכת" : "לא נמצאו משתמשים"}
                </p>
              ) : (
                filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => startConversation(u.id)}
                    className="w-full text-right px-4 py-3 hover:bg-gray-50 transition border-b border-gray-50 last:border-0 flex items-center gap-3"
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                      style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
                    >
                      {getInitials(u.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-900 truncate">{u.name}</p>
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
