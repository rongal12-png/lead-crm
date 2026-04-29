import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Header from "@/components/layout/Header";
import Link from "next/link";
import { formatCurrency, formatRelativeTime, priorityColor, leadTypeColor } from "@/lib/utils";
import {
  Users,
  Flame,
  CheckSquare,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Clock,
  ArrowRight,
  Lightbulb,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const userId = session.user.id;
  const isManagerOrAdmin = session.user.role === "ADMIN" || session.user.role === "MANAGER";

  const whereLeads = isManagerOrAdmin ? { status: "ACTIVE" as const } : { status: "ACTIVE" as const, ownerId: userId };

  const [
    totalLeads,
    hotLeads,
    openTasks,
    overdueTasks,
    pipelineAgg,
    recentActivities,
    myTasks,
    insights,
    topLeads,
  ] = await Promise.all([
    prisma.lead.count({ where: whereLeads }),
    prisma.lead.count({ where: { ...whereLeads, aiScore: { gte: 70 } } }),
    prisma.task.count({
      where: {
        assignedTo: isManagerOrAdmin ? undefined : userId,
        status: { in: ["OPEN", "IN_PROGRESS"] },
      },
    }),
    prisma.task.count({
      where: {
        assignedTo: isManagerOrAdmin ? undefined : userId,
        status: { in: ["OPEN", "IN_PROGRESS"] },
        dueAt: { lt: new Date() },
      },
    }),
    prisma.lead.aggregate({
      where: whereLeads,
      _sum: { potentialAmount: true, closedAmount: true },
    }),
    prisma.activity.findMany({
      where: isManagerOrAdmin ? {} : { lead: { ownerId: userId } },
      include: {
        user: { select: { name: true, image: true } },
        lead: { select: { id: true, displayName: true } },
      },
      orderBy: { occurredAt: "desc" },
      take: 8,
    }),
    prisma.task.findMany({
      where: {
        assignedTo: userId,
        status: { in: ["OPEN", "IN_PROGRESS"] },
      },
      include: {
        lead: { select: { id: true, displayName: true } },
      },
      orderBy: [{ dueAt: "asc" }],
      take: 5,
    }),
    prisma.aIInsight.findMany({
      where: {
        status: "ACTIVE",
        ...(isManagerOrAdmin ? {} : { userId }),
      },
      include: { lead: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.lead.findMany({
      where: whereLeads,
      include: {
        leadType: true,
        stage: true,
        owner: { select: { name: true } },
      },
      orderBy: { aiScore: "desc" },
      take: 6,
    }),
  ]);

  const kpis = [
    {
      label: "Total Leads",
      value: totalLeads,
      icon: Users,
      color: "bg-blue-50 text-blue-600",
      href: "/leads",
    },
    {
      label: "Hot Leads",
      value: hotLeads,
      icon: Flame,
      color: "bg-orange-50 text-orange-600",
      href: "/leads?minScore=70",
    },
    {
      label: "Open Tasks",
      value: openTasks,
      icon: CheckSquare,
      color: "bg-green-50 text-green-600",
      href: "/tasks",
    },
    {
      label: "Overdue Tasks",
      value: overdueTasks,
      icon: AlertTriangle,
      color: "bg-red-50 text-red-600",
      href: "/tasks?overdue=true",
    },
    {
      label: "Pipeline Value",
      value: formatCurrency(pipelineAgg._sum.potentialAmount),
      icon: TrendingUp,
      color: "bg-indigo-50 text-indigo-600",
      href: "/pipeline",
    },
    {
      label: "Closed Won",
      value: formatCurrency(pipelineAgg._sum.closedAmount),
      icon: DollarSign,
      color: "bg-emerald-50 text-emerald-600",
      href: "/reports",
    },
  ];

  const severityColor = (sev: string) => {
    switch (sev) {
      case "CRITICAL": return "bg-red-100 text-red-700 border-red-200";
      case "HIGH": return "bg-orange-100 text-orange-700 border-orange-200";
      case "MEDIUM": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default: return "bg-blue-100 text-blue-700 border-blue-200";
    }
  };

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Link key={kpi.label} href={kpi.href} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition group">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${kpi.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                <p className="text-sm text-gray-500 mt-0.5">{kpi.label}</p>
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Leads */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Top Leads by AI Score</h2>
              <Link href="/leads" className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {topLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  className="flex items-center gap-3 p-4 hover:bg-gray-50 transition"
                >
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">
                    {lead.aiScore ?? "—"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{lead.displayName}</p>
                    <p className="text-xs text-gray-400">{lead.companyName ?? lead.stage?.name ?? "—"}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {lead.leadType && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${leadTypeColor(lead.leadType.name)}`}>
                        {lead.leadType.name}
                      </span>
                    )}
                    <span className="text-sm font-semibold text-gray-700">
                      {formatCurrency(lead.potentialAmount)}
                    </span>
                  </div>
                </Link>
              ))}
              {topLeads.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">No active leads</p>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* AI Insights */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-500" />
                <h2 className="font-semibold text-gray-900">AI Insights</h2>
              </div>
              <div className="p-3 space-y-2">
                {insights.map((insight) => (
                  <Link
                    key={insight.id}
                    href={insight.leadId ? `/leads/${insight.leadId}` : "#"}
                    className={`block p-3 rounded-lg border text-xs ${severityColor(insight.severity)} hover:opacity-80 transition`}
                  >
                    <p className="font-semibold">{insight.title}</p>
                    <p className="mt-0.5 opacity-80 line-clamp-2">{insight.message}</p>
                  </Link>
                ))}
                {insights.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No active insights</p>
                )}
              </div>
            </div>

            {/* My Tasks */}
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">My Tasks</h2>
                <Link href="/tasks" className="text-sm text-indigo-600 flex items-center gap-1">
                  All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-gray-50">
                {myTasks.map((task) => {
                  const isOverdue = task.dueAt && new Date(task.dueAt) < new Date();
                  return (
                    <div key={task.id} className="p-3 flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${isOverdue ? "bg-red-500" : "bg-green-500"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                        {task.lead && (
                          <p className="text-xs text-gray-400 truncate">{task.lead.displayName}</p>
                        )}
                        {task.dueAt && (
                          <p className={`text-xs mt-0.5 flex items-center gap-1 ${isOverdue ? "text-red-500" : "text-gray-400"}`}>
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(task.dueAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {myTasks.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No open tasks</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {recentActivities.map((activity) => {
              const lead = activity as { lead?: { id: string; displayName: string } };
              return (
                <div key={activity.id} className="p-4 flex items-start gap-3">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900">
                        {activity.user?.name ?? "System"}
                      </span>
                      <span className="text-sm text-gray-500">{activity.title ?? activity.type}</span>
                      {lead.lead && (
                        <Link href={`/leads/${lead.lead.id}`} className="text-sm text-indigo-600 hover:underline truncate">
                          {lead.lead.displayName}
                        </Link>
                      )}
                    </div>
                    {activity.content && (
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{activity.content}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{formatRelativeTime(activity.occurredAt)}</span>
                </div>
              );
            })}
            {recentActivities.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
