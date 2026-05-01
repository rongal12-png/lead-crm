"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard, Users, Columns3, CheckSquare,
  TrendingUp, Bot, Settings2, LogOut, ChevronDown,
  Zap, ChevronRight, Circle,
} from "lucide-react";
import { getInitials } from "@/lib/utils";
import { useState } from "react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, color: "#818cf8" },
  { href: "/leads", label: "Leads", icon: Users, color: "#34d399" },
  { href: "/pipeline", label: "Pipeline", icon: Columns3, color: "#60a5fa" },
  { href: "/tasks", label: "Tasks", icon: CheckSquare, color: "#fb923c" },
  { href: "/reports", label: "Reports", icon: TrendingUp, color: "#f472b6" },
  { href: "/ai", label: "AI Assistant", icon: Bot, color: "#a78bfa" },
];

const adminNav = [
  { href: "/admin", label: "Back Office", icon: Settings2, color: "#94a3b8" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  const isAdmin = session?.user?.role === "ADMIN";
  const role = session?.user?.role ?? "AGENT";
  const name = session?.user?.name ?? "";

  function NavItem({ href, label, icon: Icon, color }: { href: string; label: string; icon: typeof LayoutDashboard; color: string }) {
    const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/")) || (href === "/dashboard" && pathname === "/dashboard");
    return (
      <Link href={href}
        style={active ? { background: "rgba(99,102,241,0.12)", color: "#c7d2fe" } : {}}
        className={`group flex items-center gap-3 px-3 py-[9px] rounded-lg text-[13.5px] font-medium transition-all duration-100 ${
          active ? "" : "text-[#8b92b0] hover:text-[#d1d5db] hover:bg-white/[0.05]"
        }`}
      >
        <div
          className="w-[30px] h-[30px] rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
          style={{
            background: active ? `${color}22` : "rgba(255,255,255,0.04)",
          }}
        >
          <Icon className="w-[15px] h-[15px]" style={{ color: active ? color : "#6b7280" }} />
        </div>
        <span className="flex-1 leading-none">{label}</span>
        {active && <Circle className="w-1.5 h-1.5 flex-shrink-0 fill-current" style={{ color }} />}
      </Link>
    );
  }

  return (
    <aside
      className="w-60 flex flex-col min-h-screen fixed left-0 top-0 z-30"
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
        <div className="px-3 py-1.5 rounded-lg text-center"
          style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.12)" }}>
          <p className="text-[10px] font-semibold" style={{ color: "#4b5270" }}>LeadOS v0.1 • AI Active</p>
        </div>
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
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm transition hover:bg-white/[0.05]"
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
