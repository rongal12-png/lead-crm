"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard, Users, Columns3, CheckSquare,
  TrendingUp, Bot, Settings2, LogOut, ChevronDown,
  Zap, ChevronRight,
} from "lucide-react";
import { getInitials } from "@/lib/utils";
import { useState } from "react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: Columns3 },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/reports", label: "Reports", icon: TrendingUp },
  { href: "/ai", label: "AI Assistant", icon: Bot },
];

const adminNav = [
  { href: "/admin", label: "Back Office", icon: Settings2 },
];

const roleColors: Record<string, string> = {
  ADMIN: "bg-red-500",
  MANAGER: "bg-orange-500",
  AGENT: "bg-indigo-500",
  VIEWER: "bg-gray-500",
};

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  const isAdmin = session?.user?.role === "ADMIN";
  const role = session?.user?.role ?? "AGENT";
  const initials = getInitials(session?.user?.name ?? "U");

  return (
    <aside
      className="w-60 flex flex-col min-h-screen fixed left-0 top-0 z-30 select-none"
      style={{ background: "#1b1c2e" }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
          >
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-[15px] leading-tight tracking-tight">LeadOS</p>
            <p className="text-[#5d627a] text-[11px] font-medium">AI Sales Platform</p>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-bold text-[#3d4262] uppercase tracking-widest px-3 mb-2">
          Menu
        </p>
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`nav-item ${active ? "active" : ""}`}
            >
              <Icon className="w-[17px] h-[17px] flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 opacity-40" />}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="pt-5 pb-2">
              <p className="text-[10px] font-bold text-[#3d4262] uppercase tracking-widest px-3">
                Administration
              </p>
            </div>
            {adminNav.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link key={href} href={href} className={`nav-item ${active ? "active" : ""}`}>
                  <Icon className="w-[17px] h-[17px] flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  {active && <ChevronRight className="w-3.5 h-3.5 opacity-40" />}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-white/[0.06]">
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.06] transition"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${roleColors[role] ?? "bg-indigo-500"}`}>
              {initials}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-[13px] font-semibold text-white truncate">{session?.user?.name}</p>
              <p className="text-[11px] text-[#5d627a] capitalize">{role.toLowerCase()}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#5d627a] flex-shrink-0" />
          </button>

          {menuOpen && (
            <div
              className="absolute bottom-full left-0 right-0 mb-2 rounded-xl overflow-hidden border border-white/10"
              style={{ background: "#252740" }}
            >
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-400 hover:bg-white/[0.05] transition"
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
