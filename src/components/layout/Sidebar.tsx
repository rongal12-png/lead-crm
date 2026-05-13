"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard, Users, Columns3, CheckSquare,
  TrendingUp, Bot, Settings2, LogOut, ChevronDown,
  Zap, ChevronRight, Circle, CalendarRange, FileText,
  Trash2, Database, UserCircle, MessageSquare, History,
} from "lucide-react";
import UnreadBadge from "@/components/inbox/UnreadBadge";
import { getInitials } from "@/lib/utils";
import { CURRENT_VERSION } from "@/lib/version-log";
import { useState } from "react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, color: "#818cf8" },
  { href: "/leads", label: "Leads", icon: Users, color: "#34d399" },
  { href: "/pipeline", label: "Pipeline", icon: Columns3, color: "#60a5fa" },
  { href: "/tasks", label: "Tasks", icon: CheckSquare, color: "#fb923c" },
  { href: "/inbox", label: "Inbox", icon: MessageSquare, color: "#38bdf8", badge: true },
  { href: "/reports/weekly", label: "Weekly Summary", icon: CalendarRange, color: "#22d3ee" },
  { href: "/reports", label: "Reports", icon: TrendingUp, color: "#f472b6" },
  { href: "/kai-terms", label: "Kai Terms", icon: FileText, color: "#facc15" },
  { href: "/ai", label: "AI Assistant", icon: Bot, color: "#a78bfa" },
];

const adminNav = [
  { href: "/admin", label: "Back Office", icon: Settings2, color: "#94a3b8" },
  { href: "/admin/backups", label: "Backups", icon: Database, color: "#38bdf8" },
  { href: "/admin/changelog", label: "Version Log", icon: History, color: "#c084fc" },
  { href: "/trash", label: "Trash / Restore", icon: Trash2, color: "#f87171" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  const isAdmin = session?.user?.role === "ADMIN";
  const role = session?.user?.role ?? "USER";
  const name = session?.user?.name ?? "";

  const allHrefs = [...nav.map((n) => n.href), ...adminNav.map((n) => n.href)];
  function NavItem({ href, label, icon: Icon, color, badge }: { href: string; label: string; icon: typeof LayoutDashboard; color: string; badge?: boolean }) {
    const exact = pathname === href;
    const prefix = href !== "/dashboard" && pathname.startsWith(href + "/");
    const hasMoreSpecific = allHrefs.some(
      (other) => other !== href && other.startsWith(href + "/") && (pathname === other || pathname.startsWith(other + "/"))
    );
    const active = exact || (prefix && !hasMoreSpecific) || (href === "/dashboard" && pathname === "/dashboard");
    return (
      <Link href={href}
        style={active ? { background: "rgba(99,102,241,0.12)", color: "#c7d2fe" } : {}}
        className={`group flex items-center gap-3 px-3 py-[9px] rounded-lg text-[13.5px] font-medium transition-all duration-100 ${
          active ? "" : "text-[#8b92b0] hover:text-[#d1d5db] hover:bg-white/[0.05]"
        }`}
      >
        <div
          className="relative w-[30px] h-[30px] rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
          style={{
            background: active ? `${color}22` : "rgba(255,255,255,0.04)",
          }}
        >
          <Icon className="w-[15px] h-[15px]" style={{ color: active ? color : "#6b7280" }} />
          {badge && <UnreadBadge />}
        </div>
        <span className="flex-1 leading-none">{label}</span>
        {active && <Circle className="w-1.5 h-1.5 flex-shrink-0 fill-current" style={{ color }} />}
      </Link>
    );
  }

  return (
    <aside
      className="w-60 flex flex-col h-screen fixed left-0 top-0 z-30"
      style={{ background: "#13131f", borderRight: "1px solid rgba(255,255,255,0.05)" }}
    >
      {/* Logo */}
      <div className="px-4 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-3 px-1">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)", boxShadow: "0 0 16px rgba(99,102,241,0.4)" }}
          >
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-black text-[15px] tracking-tight leading-none">LeadOS</p>
            <p className="text-[11px] mt-0.5" style={{ color: "#4b5270" }}>AI Sales Platform</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-bold uppercase tracking-widest px-3 mb-3" style={{ color: "#2d3252" }}>
          Workspace
        </p>
        {nav.map((item) => <NavItem key={item.href} {...item} />)}

        {isAdmin && (
          <>
            <div className="pt-5 pb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest px-3" style={{ color: "#2d3252" }}>
                Admin
              </p>
            </div>
            {adminNav.map((item) => <NavItem key={item.href} {...item} />)}
          </>
        )}
      </nav>

      {/* Version badge */}
      <div className="px-4 pb-2">
        {isAdmin ? (
          <Link
            href="/admin/changelog"
            className="block px-3 py-1.5 rounded-lg text-center transition hover:bg-indigo-500/10"
            style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.12)" }}
            title="Version log"
          >
            <p className="text-[10px] font-semibold" style={{ color: "#4b5270" }}>LeadOS v{CURRENT_VERSION} • AI Active</p>
          </Link>
        ) : (
          <div className="px-3 py-1.5 rounded-lg text-center"
            style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.12)" }}>
            <p className="text-[10px] font-semibold" style={{ color: "#4b5270" }}>LeadOS v{CURRENT_VERSION} • AI Active</p>
          </div>
        )}
      </div>

      {/* User */}
      <div className="px-3 pb-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "12px" }}>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-white/[0.05]"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
            >
              {getInitials(name)}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-[13px] font-bold text-white truncate leading-none">{name}</p>
              <p className="text-[11px] mt-0.5 capitalize" style={{ color: "#4b5270" }}>{role.toLowerCase()}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#4b5270" }} />
          </button>

          {menuOpen && (
            <div
              className="absolute bottom-full left-0 right-0 mb-2 rounded-xl overflow-hidden"
              style={{ background: "#1e1f35", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 -8px 32px rgba(0,0,0,0.4)" }}
            >
              <Link
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm transition hover:bg-white/[0.05]"
                style={{ color: "#cbd5e1" }}
              >
                <UserCircle className="w-4 h-4" />
                Edit profile
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm transition hover:bg-white/[0.05] border-t border-white/[0.05]"
                style={{ color: "#f87171" }}
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
