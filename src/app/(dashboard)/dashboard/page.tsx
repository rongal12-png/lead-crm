import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Header from "@/components/layout/Header";
import Link from "next/link";
import { formatCurrency, formatRelativeTime, leadTypeColor } from "@/lib/utils";
import {
  Users, Flame, CheckSquare, AlertTriangle,
  TrendingUp, DollarSign, Clock, ArrowUpRight,
  Lightbulb, Activity,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const userId = session.user.id;
  const isManagerOrAdmin = session.user.role === "ADMIN" || session.user.role === "MANAGER";
  const where = isManagerOrAdmin ? { status: "ACTIVE" as const } : { status: "ACTIVE" as const, ownerId: userId };

  const [totalLeads, hotLeads, openTasks, overdueTasks, pipelineAgg, recentActivities, myTasks, insights, topLeads] =
    await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.count({ where: { ...where, aiScore: { gte: 70 } } }),
      prisma.task.count({ where: { assignedTo: isManagerOrAdmin ? undefined : userId, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
      prisma.task.count({ where: { assignedTo: isManagerOrAdmin ? undefined : userId, status: { in: ["OPEN", "IN_PROGRESS"] }, dueAt: { lt: new Date() } } }),
      prisma.lead.aggregate({ where, _sum: { potentialAmount: true, closedAmount: true } }),
      prisma.activity.findMany({
        where: isManagerOrAdmin ? {} : { lead: { ownerId: userId } },
        include: { user: { select: { name: true } }, lead: { select: { id: true, displayName: true } } },
        orderBy: { occurredAt: "desc" },
        take: 8,
      }),
      prisma.task.findMany({
        where: { assignedTo: userId, status: { in: ["OPEN", "IN_PROGRESS"] } },
        include: { lead: { select: { id: true, displayName: true } } },
        orderBy: [{ dueAt: "asc" }],
        take: 5,
      }),
      prisma.aIInsight.findMany({
        where: { status: "ACTIVE", ...(isManagerOrAdmin ? {} : { userId }) },
        include: { lead: { select: { id: true, displayName: true } } },
        orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
        take: 6,
      }),
      prisma.lead.findMany({
        where,
        include: { leadType: true, stage: true, owner: { select: { name: true } } },
        orderBy: { aiScore: "desc" },
        take: 6,
      }),
    ]);

  const kpis = [
    {
      label: "Total Leads",
      value: totalLeads,
      icon: Users,
      href: "/leads",
      from: "#6366f1",
      to: "#8b5cf6",
      light: "#eef2ff",
      iconColor: "#6366f1",
    },
    {
      label: "Hot Leads",
      value: hotLeads,
      icon: Flame,
      href: "/leads?minScore=70",
      from: "#f97316",
      to: "#ef4444",
      light: "#fff7ed",
      iconColor: "#f97316",
    },
    {
      label: "Open Tasks",
      value: openTasks,
      icon: CheckSquare,
      href: "/tasks",
      from: "#10b981",
      to: "#059669",
      light: "#ecfdf5",
      iconColor: "#10b981",
    },
    {
      label: "Overdue",
      value: overdueTasks,
      icon: AlertTriangle,
      href: "/tasks?overdue=true",
      from: "#ef4444",
      to: "#dc2626",
      light: "#fef2f2",
      iconColor: "#ef4444",
    },
    {
      label: "Pipeline",
      value: formatCurrency(pipelineAgg._sum.potentialAmount),
      icon: TrendingUp,
      href: "/pipeline",
      from: "#3b82f6",
      to: "#2563eb",
      light: "#eff6ff",
      iconColor: "#3b82f6",
    },
    {
      label: "Won",
      value: formatCurrency(pipelineAgg._sum.closedAmount),
      icon: DollarSign,
      href: "/reports",
      from: "#10b981",
      to: "#0d9488",
      light: "#f0fdf4",
      iconColor: "#10b981",
    },
  ];

  const severityStyle = (s: string) => {
    if (s === "CRITICAL") return { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" };
    if (s === "HIGH") return { bg: "#fff7ed", text: "#ea580c", border: "#fed7aa" };
    if (s === "MEDIUM") return { bg: "#fefce8", text: "#ca8a04", border: "#fde68a" };
    return { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" };
  };

  const activityIcon: Record<string, string> = {
    NOTE: "📝", CALL: "📞", MEETING: "🤝", EMAIL: "📧",
    STAGE_CHANGE: "➡️", TASK_CREATED: "✅", AI_COMMAND: "🤖",
    LEAD_CREATED: "✨", WHATSAPP: "💬",
  };

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6 max-w-[1400px]">

        {/* Welcome banner */}
        <div
          className="rounded-2xl p-6 flex items-center justify-between overflow-hidden relative"
          style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)" }}
        >
          <div className="relative z-10">
            <p className="text-indigo-300 text-sm font-semibold mb-1">Good work, {session.user.name?.split(" ")[0]} 👋</p>
            <h2 className="text-white text-2xl font-black mb-1">Your Sales Dashboard</h2>
            <p className="text-slate-400 text-sm">Here&apos;s what&apos;s happening with your leads today.</p>
          </div>
          <Link href="/ai"
            className="hidden sm:flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white transition hover:opacity-90 flex-shrink-0"
            style={{ background: "rgba(99,102,241,0.25)", border: "1px solid rgba(99,102,241,0.4)" }}>
            Ask AI Assistant →
          </Link>
          <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full opacity-[0.04]"
            style={{ background: "radial-gradient(circle, #818cf8, transparent)" }} />
        </div>

        {/* AI Recommendations — top of page */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#fef3c7,#fde68a)" }}>
                <Lightbulb className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-[15px]">AI Recommendations</h2>
                <p className="text-xs text-gray-400">Top actions Claude recommends right now</p>
              </div>
            </div>
            <Link href="/ai" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          {insights.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-2 text-gray-300">
              <Lightbulb className="w-8 h-8 opacity-30" />
              <p className="text-sm">No recommendations right now — your pipeline is healthy.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
              {insights.map((insight) => {
                const s = severityStyle(insight.severity);
                return (
                  <Link key={insight.id} href={insight.leadId ? `/leads/${insight.leadId}` : "#"}
                    className="block p-4 rounded-xl border text-sm transition hover:shadow-md hover:-translate-y-0.5"
                    style={{ background: s.bg, borderColor: s.border, color: s.text }}
                  >
                    <p className="font-bold leading-tight">{insight.title}</p>
                    <p className="mt-1 text-xs opacity-80 line-clamp-2">{insight.message}</p>
                    {insight.recommendedAction && (
                      <p className="mt-2 text-xs font-semibold flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3" />
                        {insight.recommendedAction}
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Link key={kpi.label} href={kpi.href}
                className="group bg-white rounded-2xl p-5 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 border border-gray-100"
                style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: kpi.light }}>
                    <Icon className="w-5 h-5" style={{ color: kpi.iconColor }} />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition" />
                </div>
                <p className="text-2xl font-black text-gray-900 leading-none mb-1">{kpi.value}</p>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{kpi.label}</p>
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Leads */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <div className="px-5 py-4 flex items-center justify-between border-b border-gray-50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-indigo-50">
                  <Flame className="w-4 h-4 text-indigo-500" />
                </div>
                <h2 className="font-bold text-gray-900 text-[15px]">Top Leads by AI Score</h2>
              </div>
              <Link href="/leads" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition">
                View all <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div>
              {topLeads.map((lead, idx) => (
                <Link key={lead.id} href={`/leads/${lead.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition group border-b border-gray-50 last:border-0"
                >
                  <span className="text-xs font-bold text-gray-300 w-4 flex-shrink-0">#{idx + 1}</span>
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0"
                    style={{
                      background: lead.aiScore && lead.aiScore >= 70 ? "linear-gradient(135deg,#f97316,#ef4444)" :
                        lead.aiScore && lead.aiScore >= 50 ? "linear-gradient(135deg,#f59e0b,#f97316)" :
                        "linear-gradient(135deg,#6366f1,#8b5cf6)",
                      color: "white",
                    }}
                  >
                    {lead.aiScore ?? "–"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate group-hover:text-indigo-600 transition">{lead.displayName}</p>
                    <p className="text-xs text-gray-400 truncate">{lead.companyName ?? lead.stage?.name ?? "—"}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {lead.leadType && (
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${leadTypeColor(lead.leadType.name)}`}>
                        {lead.leadType.name}
                      </span>
                    )}
                    <span className="text-sm font-black text-gray-700">{formatCurrency(lead.potentialAmount)}</span>
                  </div>
                </Link>
              ))}
              {topLeads.length === 0 && (
                <div className="flex flex-col items-center py-12 gap-2 text-gray-300">
                  <Users className="w-8 h-8 opacity-30" />
                  <p className="text-sm">No active leads yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* My Tasks */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
              style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-orange-50">
                    <CheckSquare className="w-4 h-4 text-orange-500" />
                  </div>
                  <h2 className="font-bold text-gray-900 text-[15px]">My Tasks</h2>
                </div>
                <Link href="/tasks" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
                  All →
                </Link>
              </div>
              <div className="divide-y divide-gray-50">
                {myTasks.map((task) => {
                  const overdue = task.dueAt && new Date(task.dueAt) < new Date();
                  return (
                    <div key={task.id} className="px-5 py-3 flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${overdue ? "bg-red-500" : "bg-emerald-500"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{task.title}</p>
                        {task.lead && <p className="text-xs text-gray-400 truncate">{task.lead.displayName}</p>}
                        {task.dueAt && (
                          <p className={`text-xs mt-0.5 flex items-center gap-1 ${overdue ? "text-red-500 font-semibold" : "text-gray-400"}`}>
                            <Clock className="w-3 h-3" />{formatRelativeTime(task.dueAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {myTasks.length === 0 && (
                  <div className="flex flex-col items-center py-6 gap-1.5 text-gray-300">
                    <CheckSquare className="w-6 h-6 opacity-40" />
                    <p className="text-xs">All tasks done! 🎉</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Activity feed */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-indigo-50">
              <Activity className="w-4 h-4 text-indigo-500" />
            </div>
            <h2 className="font-bold text-gray-900 text-[15px]">Recent Activity</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {recentActivities.map((activity) => {
              const lead = activity as { lead?: { id: string; displayName: string } };
              const emoji = activityIcon[activity.type] ?? "📌";
              return (
                <div key={activity.id} className="px-5 py-3.5 flex items-start gap-3">
                  <span className="text-lg flex-shrink-0 mt-0.5">{emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-gray-900">{activity.user?.name ?? "System"}</span>
                      <span className="text-sm text-gray-500">{activity.title ?? activity.type.toLowerCase().replace(/_/g, " ")}</span>
                      {lead.lead && (
                        <Link href={`/leads/${lead.lead.id}`}
                          className="text-sm font-semibold text-indigo-600 hover:underline truncate">
                          {lead.lead.displayName}
                        </Link>
                      )}
                    </div>
                    {activity.content && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{activity.content}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-300 flex-shrink-0 mt-0.5">{formatRelativeTime(activity.occurredAt)}</span>
                </div>
              );
            })}
            {recentActivities.length === 0 && (
              <div className="flex flex-col items-center py-10 gap-2 text-gray-300">
                <Activity className="w-8 h-8 opacity-30" />
                <p className="text-sm">No activity yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
