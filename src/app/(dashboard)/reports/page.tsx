import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Header from "@/components/layout/Header";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, Users, CheckSquare, DollarSign, Target, BarChart2 } from "lucide-react";

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const isManagerOrAdmin = session.user.role === "ADMIN" || session.user.role === "MANAGER";
  const whereLeads = isManagerOrAdmin ? {} : { ownerId: session.user.id };

  const [
    totalLeads,
    activeLeads,
    wonLeads,
    lostLeads,
    pipelineValue,
    closedValue,
    leadsByType,
    leadsByStage,
    taskStats,
    topAgents,
  ] = await Promise.all([
    prisma.lead.count({ where: whereLeads }),
    prisma.lead.count({ where: { ...whereLeads, status: "ACTIVE" } }),
    prisma.lead.count({ where: { ...whereLeads, stage: { isWon: true } } }),
    prisma.lead.count({ where: { ...whereLeads, stage: { isLost: true } } }),
    prisma.lead.aggregate({ where: { ...whereLeads, status: "ACTIVE" }, _sum: { potentialAmount: true } }),
    prisma.lead.aggregate({ where: { ...whereLeads, stage: { isWon: true } }, _sum: { closedAmount: true } }),
    prisma.lead.groupBy({
      by: ["leadTypeId"],
      where: whereLeads,
      _count: { id: true },
      _sum: { potentialAmount: true },
    }),
    prisma.lead.groupBy({
      by: ["stageId"],
      where: { ...whereLeads, status: "ACTIVE" },
      _count: { id: true },
      _sum: { potentialAmount: true },
    }),
    Promise.all([
      prisma.task.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
      prisma.task.count({ where: { status: "COMPLETED" } }),
      prisma.task.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] }, dueAt: { lt: new Date() } } }),
    ]),
    isManagerOrAdmin
      ? prisma.user.findMany({
          where: { role: "AGENT" },
          select: {
            id: true,
            name: true,
            _count: { select: { ownedLeads: true } },
          },
          take: 10,
        })
      : [],
  ]);

  const leadTypes = await prisma.leadType.findMany({
    select: { id: true, name: true, color: true },
  });

  const stages = await prisma.stage.findMany({
    select: { id: true, name: true, color: true, pipelineId: true },
  });

  const leadsByTypeWithNames = leadsByType.map((item) => ({
    ...item,
    name: leadTypes.find((lt) => lt.id === item.leadTypeId)?.name ?? "Unknown",
    color: leadTypes.find((lt) => lt.id === item.leadTypeId)?.color ?? "#6366f1",
  }));

  const leadsByStageWithNames = leadsByStage
    .map((item) => ({
      ...item,
      name: stages.find((s) => s.id === item.stageId)?.name ?? "Unknown",
      color: stages.find((s) => s.id === item.stageId)?.color ?? "#6366f1",
    }))
    .sort((a, b) => b._count.id - a._count.id)
    .slice(0, 10);

  const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  const kpis = [
    { label: "Total Leads", value: totalLeads, icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: "Active Leads", value: activeLeads, icon: TrendingUp, color: "text-green-600 bg-green-50" },
    { label: "Pipeline Value", value: formatCurrency(pipelineValue._sum.potentialAmount), icon: DollarSign, color: "text-indigo-600 bg-indigo-50" },
    { label: "Closed Won Value", value: formatCurrency(closedValue._sum.closedAmount), icon: Target, color: "text-emerald-600 bg-emerald-50" },
    { label: "Conversion Rate", value: `${conversionRate}%`, icon: BarChart2, color: "text-purple-600 bg-purple-50" },
    { label: "Won / Lost", value: `${wonLeads} / ${lostLeads}`, icon: CheckSquare, color: "text-orange-600 bg-orange-50" },
  ];

  return (
    <div>
      <Header title="Reports & Analytics" />
      <div className="p-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${kpi.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-xl font-bold text-gray-900">{kpi.value}</p>
                <p className="text-sm text-gray-500 mt-0.5">{kpi.label}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Leads by Type */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Leads by Type</h3>
            <div className="space-y-3">
              {leadsByTypeWithNames.map((item) => (
                <div key={item.leadTypeId ?? "unknown"}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{item.name}</span>
                    <div className="flex gap-3 text-gray-500">
                      <span>{item._count.id} leads</span>
                      <span>{formatCurrency(item._sum.potentialAmount)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${totalLeads > 0 ? (item._count.id / totalLeads) * 100 : 0}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}
              {leadsByTypeWithNames.length === 0 && <p className="text-sm text-gray-400">No data</p>}
            </div>
          </div>

          {/* Leads by Stage */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Active Leads by Stage</h3>
            <div className="space-y-2">
              {leadsByStageWithNames.map((item) => (
                <div key={item.stageId ?? "unknown"} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-gray-700 flex-1 truncate">{item.name}</span>
                  <span className="text-sm font-semibold text-gray-900">{item._count.id}</span>
                  <span className="text-xs text-gray-400">{formatCurrency(item._sum.potentialAmount)}</span>
                </div>
              ))}
              {leadsByStageWithNames.length === 0 && <p className="text-sm text-gray-400">No data</p>}
            </div>
          </div>

          {/* Task Stats */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Task Statistics</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { label: "Open", value: taskStats[0], color: "text-blue-600" },
                { label: "Completed", value: taskStats[1], color: "text-green-600" },
                { label: "Overdue", value: taskStats[2], color: "text-red-600" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Top Agents */}
          {isManagerOrAdmin && topAgents.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Agent Leaderboard</h3>
              <div className="space-y-2">
                {topAgents
                  .sort((a, b) => b._count.ownedLeads - a._count.ownedLeads)
                  .map((agent, index) => (
                    <div key={agent.id} className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {index + 1}
                      </span>
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-600 flex-shrink-0">
                        {agent.name[0]}
                      </div>
                      <span className="flex-1 text-sm font-medium text-gray-900">{agent.name}</span>
                      <span className="text-sm text-gray-500">{agent._count.ownedLeads} leads</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
