import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import Header from "@/components/layout/Header";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, Users, CheckSquare, DollarSign, Target, BarChart2 } from "lucide-react";
import {
  LeadsOverTimeChart,
  RevenueByMonthChart,
  PipelineFunnel,
  SourceBreakdown,
  WinRateByType,
  AgentLeaderboard,
  type FunnelPoint,
  type WinRateRow,
  type AgentRow,
} from "@/components/reports/ReportsCharts";

const FUNNEL_COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const isManagerOrAdmin = session.user.role === "ADMIN" || session.user.role === "MANAGER";
  const userId = session.user.id;
  const whereLeads = isManagerOrAdmin ? {} : { ownerId: userId };
  const ownerSql = isManagerOrAdmin ? Prisma.sql`` : Prisma.sql`AND l."ownerId" = ${userId}`;
  const ownerSqlNoAlias = isManagerOrAdmin ? Prisma.sql`` : Prisma.sql`AND "ownerId" = ${userId}`;

  const since90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const since6mo = new Date();
  since6mo.setMonth(since6mo.getMonth() - 5);
  since6mo.setDate(1);

  const [
    totalLeads,
    activeLeads,
    wonLeads,
    lostLeads,
    pipelineValue,
    closedValue,
    leadsCreatedRaw,
    revenueByMonthRaw,
    leadsByStage,
    leadsBySourceRaw,
    winRateByTypeRaw,
    agentPerfRaw,
    taskStats,
    leadTypes,
    stages,
    users,
  ] = await Promise.all([
    prisma.lead.count({ where: whereLeads }),
    prisma.lead.count({ where: { ...whereLeads, status: "ACTIVE" } }),
    prisma.lead.count({ where: { ...whereLeads, stage: { isWon: true } } }),
    prisma.lead.count({ where: { ...whereLeads, stage: { isLost: true } } }),
    prisma.lead.aggregate({ where: { ...whereLeads, status: "ACTIVE" }, _sum: { potentialAmount: true } }),
    prisma.lead.aggregate({ where: { ...whereLeads, stage: { isWon: true } }, _sum: { closedAmount: true } }),
    prisma.$queryRaw<Array<{ bucket: Date; count: bigint }>>(Prisma.sql`
      SELECT DATE_TRUNC('week', "createdAt") AS bucket, COUNT(*)::bigint AS count
      FROM "Lead"
      WHERE "createdAt" >= ${since90}
      ${ownerSqlNoAlias}
      GROUP BY bucket
      ORDER BY bucket ASC
    `),
    prisma.$queryRaw<Array<{ bucket: Date; revenue: number | null; deals: bigint }>>(Prisma.sql`
      SELECT DATE_TRUNC('month', l."updatedAt") AS bucket,
             COALESCE(SUM(l."closedAmount"), 0)::float8 AS revenue,
             COUNT(*)::bigint AS deals
      FROM "Lead" l
      INNER JOIN "Stage" s ON l."stageId" = s."id"
      WHERE s."isWon" = true AND l."updatedAt" >= ${since6mo}
      ${ownerSql}
      GROUP BY bucket
      ORDER BY bucket ASC
    `),
    prisma.lead.groupBy({
      by: ["stageId"],
      where: { ...whereLeads, status: "ACTIVE" },
      _count: { id: true },
      _sum: { potentialAmount: true },
    }),
    prisma.lead.groupBy({
      by: ["source"],
      where: { ...whereLeads, source: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 8,
    }),
    prisma.$queryRaw<Array<{ leadTypeId: string | null; total: bigint; won: bigint }>>(Prisma.sql`
      SELECT l."leadTypeId" AS "leadTypeId",
             COUNT(*)::bigint AS total,
             COALESCE(SUM(CASE WHEN s."isWon" THEN 1 ELSE 0 END), 0)::bigint AS won
      FROM "Lead" l
      LEFT JOIN "Stage" s ON l."stageId" = s."id"
      WHERE l."leadTypeId" IS NOT NULL
      ${ownerSql}
      GROUP BY l."leadTypeId"
    `),
    isManagerOrAdmin
      ? prisma.$queryRaw<Array<{ ownerId: string; total: bigint; won: bigint; revenue: number | null }>>(Prisma.sql`
          SELECT l."ownerId" AS "ownerId",
                 COUNT(*)::bigint AS total,
                 COALESCE(SUM(CASE WHEN s."isWon" THEN 1 ELSE 0 END), 0)::bigint AS won,
                 COALESCE(SUM(CASE WHEN s."isWon" THEN l."closedAmount" ELSE 0 END), 0)::float8 AS revenue
          FROM "Lead" l
          LEFT JOIN "Stage" s ON l."stageId" = s."id"
          WHERE l."ownerId" IS NOT NULL
          GROUP BY l."ownerId"
          ORDER BY won DESC, total DESC
          LIMIT 10
        `)
      : Promise.resolve([]),
    Promise.all([
      prisma.task.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
      prisma.task.count({ where: { status: "COMPLETED" } }),
      prisma.task.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] }, dueAt: { lt: new Date() } } }),
    ]),
    prisma.leadType.findMany({ select: { id: true, name: true, color: true } }),
    prisma.stage.findMany({ select: { id: true, name: true, color: true, order: true, pipelineId: true } }),
    isManagerOrAdmin
      ? prisma.user.findMany({ select: { id: true, name: true } })
      : Promise.resolve([]),
  ]);

  const fmtWeek = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const fmtMonth = (d: Date) => d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

  const leadsCreated = leadsCreatedRaw.map((r) => ({ label: fmtWeek(new Date(r.bucket)), value: Number(r.count) }));
  const revenueByMonth = revenueByMonthRaw.map((r) => ({
    label: fmtMonth(new Date(r.bucket)),
    revenue: Number(r.revenue ?? 0),
    deals: Number(r.deals),
  }));

  const stageOrder = new Map(stages.map((s) => [s.id, s.order]));
  const stageMeta = new Map(stages.map((s) => [s.id, s]));
  const funnelData: FunnelPoint[] = leadsByStage
    .filter((row) => row.stageId)
    .map((row) => ({
      name: stageMeta.get(row.stageId!)?.name ?? "Unknown",
      value: row._count.id,
      fill: stageMeta.get(row.stageId!)?.color ?? "#6366f1",
      order: stageOrder.get(row.stageId!) ?? 0,
    }))
    .sort((a, b) => a.order - b.order)
    .map(({ name, value, fill }, i) => ({ name, value, fill: fill ?? FUNNEL_COLORS[i % FUNNEL_COLORS.length] }));

  const sources = leadsBySourceRaw.map((r) => ({ name: r.source ?? "Unknown", value: r._count.id }));

  const leadTypeMap = new Map(leadTypes.map((lt) => [lt.id, lt]));
  const winRateRows: WinRateRow[] = winRateByTypeRaw.map((r) => {
    const lt = r.leadTypeId ? leadTypeMap.get(r.leadTypeId) : null;
    const total = Number(r.total);
    const won = Number(r.won);
    return {
      name: lt?.name ?? "Unknown",
      total,
      won,
      rate: total > 0 ? Math.round((won / total) * 100) : 0,
      color: lt?.color ?? "#6366f1",
    };
  }).sort((a, b) => b.rate - a.rate);

  const userMap = new Map(users.map((u) => [u.id, u.name]));
  const agentRows: AgentRow[] = agentPerfRaw.map((r) => {
    const total = Number(r.total);
    const won = Number(r.won);
    return {
      name: userMap.get(r.ownerId) ?? "Unknown",
      total,
      won,
      revenue: Number(r.revenue ?? 0),
      rate: total > 0 ? Math.round((won / total) * 100) : 0,
    };
  });

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
      <div className="p-6 space-y-6 max-w-[1400px]">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LeadsOverTimeChart data={leadsCreated} />
          <RevenueByMonthChart data={revenueByMonth} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PipelineFunnel data={funnelData} />
          <SourceBreakdown data={sources} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WinRateByType rows={winRateRows} />
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
        </div>

        {isManagerOrAdmin && (
          <AgentLeaderboard rows={agentRows} />
        )}
      </div>
    </div>
  );
}
