"use client";

import { Bell, Search, Plus, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { getInitials } from "@/lib/utils";
import VoiceCommandButton from "@/components/ai/VoiceCommandButton";

interface Notification {
  id: string;
  title: string;
  message: string;
  readAt: string | null;
  actionUrl: string | null;
  createdAt: string;
  type: string;
}

const typeIcon: Record<string, string> = {
  TASK_DUE: "⏰",
  LEAD_ASSIGNED: "👤",
  STAGE_CHANGE: "➡️",
  AI_INSIGHT: "🤖",
  SYSTEM: "🔔",
};

export default function Header({ title }: { title: string }) {
  const [search, setSearch] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const notifsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => setNotifications(d.data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifsRef.current && !notifsRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const unread = notifications.filter((n) => !n.readAt).length;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/leads?search=${encodeURIComponent(search)}`);
      setShowSearch(false);
      setSearch("");
    }
  }

  return (
    <header className="h-14 bg-white flex items-center justify-between px-6 sticky top-0 z-20" style={{ borderBottom: "1px solid #f0f0f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <h1 className="text-[17px] font-bold text-gray-900 tracking-tight">{title}</h1>

      <div className="flex items-center gap-2">
        {/* Search */}
        {showSearch ? (
          <form onSubmit={handleSearch} className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads..."
              className="pl-9 pr-8 py-2 text-sm border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64 transition"
            />
            <button
              type="button"
              onClick={() => { setShowSearch(false); setSearch(""); }}
              className="absolute right-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowSearch(true)}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <Search className="w-4.5 h-4.5" />
          </button>
        )}

        {/* Voice Command */}
        <VoiceCommandButton />

        {/* New Lead */}
        <Link
          href="/leads/new"
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white rounded-lg transition hover:opacity-90 active:scale-95"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
        >
          <Plus className="w-3.5 h-3.5" />
          New Lead
        </Link>

        {/* Notifications */}
        <div className="relative" ref={notifsRef}>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <Bell className="w-4.5 h-4.5" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 text-white text-[9px] font-bold rounded-full flex items-center justify-center"
                style={{ background: "#ef4444" }}>
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="font-bold text-sm text-gray-900">Notifications</span>
                {unread > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: "#fee2e2", color: "#dc2626" }}>
                    {unread} new
                  </span>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center py-8 gap-2">
                    <span className="text-3xl">🔔</span>
                    <p className="text-sm text-gray-400">All caught up!</p>
                  </div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <Link
                      key={n.id}
                      href={n.actionUrl ?? "#"}
                      onClick={() => setShowNotifs(false)}
                      className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-50 transition ${!n.readAt ? "bg-indigo-50/40" : ""}`}
                    >
                      <span className="text-lg flex-shrink-0 mt-0.5">{typeIcon[n.type] ?? "🔔"}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{n.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 cursor-pointer"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
          title={session?.user?.name ?? ""}
        >
          {getInitials(session?.user?.name ?? "U")}
        </div>
      </div>
    </header>
  );
}
