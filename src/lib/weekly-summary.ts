import { prisma } from "./prisma";

export type WeeklySummaryData = {
  totals: {
    newLeads: number;
    activities: number;
    callsCount: number;
    meetingsCount: number;
    emailsCount: number;
    messagesCount: number;
    notesCount: number;
    stageChanges: number;
    tasksCreated: number;
    tasksCompleted: number;
    wonDeals: number;
    lostDeals: number;
    wonAmount: number;
  };
  byOwner: Array<{
    ownerId: string | null;
    ownerName: string;
    newLeads: number;
    activities: number;
    wonDeals: number;
    wonAmount: number;
  }>;
  byLeadType: Array<{
    typeId: string | null;
    typeName: string;
    newLeads: number;
  }>;
  topNewLeads: Array<{
    leadId: string;
    displayName: string;
    companyName: string | null;
    potentialAmount: number | null;
    ownerName: string | null;
  }>;
  topWins: Array<{
    leadId: string;
    displayName: string;
    companyName: string | null;
    closedAmount: number | null;
    ownerName: string | null;
  }>;
  bySource: Array<{ source: string; count: number }>;
  tasksCompletedList?: Array<{
    taskId: string;
    title: string;
    type: string;
    priority: string;
    completedAt: string;
    leadId: string | null;
    leadName: string | null;
    assigneeName: string | null;
  }>;
  tasksInProgressList?: Array<{
    taskId: string;
    title: string;
    type: string;
    priority: string;
    dueAt: string | null;
    updatedAt: string;
    leadId: string | null;
    leadName: string | null;
    assigneeName: string | null;
  }>;
};

export function lastCompletedWeek(now: Date = new Date()): {
  weekStart: Date;
  weekEnd: Date;
} {
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday
  const thisSundayUTC = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - dayOfWeek
  );
  const prevSunday = new Date(thisSundayUTC - 7 * 24 * 60 * 60 * 1000);
  const prevSaturdayEnd = new Date(thisSundayUTC - 1);
  return { weekStart: prevSunday, weekEnd: prevSaturdayEnd };
}

export async function computeWeeklySummary(
  weekStart: Date,
  weekEnd: Date
): Promise<WeeklySummaryData> {
  const range = { gte: weekStart, lte: weekEnd };

  const [
    newLeadsCount,
    activitiesByType,
    stageChangesCount,
    tasksCreated,
    tasksCompleted,
    wonLeads,
    lostLeadsCount,
    newLeadsByOwner,
    activitiesByUser,
    newLeadsByType,
    topNewLeads,
    leadsBySource,
    tasksCompletedDetails,
    tasksInProgressDetails,
  ] = await Promise.all([
    prisma.lead.count({ where: { createdAt: range } }),
    prisma.activity.groupBy({
      by: ["type"],
      where: { occurredAt: range },
      _count: true,
    }),
    prisma.stageHistory.count({ where: { createdAt: range } }),
    prisma.task.count({ where: { createdAt: range } }),
    prisma.task.count({ where: { completedAt: range } }),
    prisma.lead.findMany({
      where: { stage: { isWon: true }, updatedAt: range },
      include: { owner: { select: { id: true, name: true } } },
      orderBy: { closedAmount: "desc" },
    }),
    prisma.lead.count({
      where: { stage: { isLost: true }, updatedAt: range },
    }),
    prisma.lead.groupBy({
      by: ["ownerId"],
      where: { createdAt: range },
      _count: true,
    }),
    prisma.activity.groupBy({
      by: ["userId"],
      where: { occurredAt: range },
      _count: true,
    }),
    prisma.lead.groupBy({
      by: ["leadTypeId"],
      where: { createdAt: range },
      _count: true,
    }),
    prisma.lead.findMany({
      where: { createdAt: range, potentialAmount: { gt: 0 } },
      include: { owner: { select: { name: true } } },
      orderBy: { potentialAmount: "desc" },
      take: 5,
    }),
    prisma.lead.groupBy({
      by: ["source"],
      where: { createdAt: range, source: { not: null } },
      _count: true,
    }),
    prisma.task.findMany({
      where: { completedAt: range, status: "COMPLETED" },
      include: {
        lead: { select: { id: true, displayName: true } },
        assignee: { select: { name: true } },
      },
      orderBy: { completedAt: "desc" },
      take: 50,
    }),
    prisma.task.findMany({
      where: { status: "IN_PROGRESS", updatedAt: range },
      include: {
        lead: { select: { id: true, displayName: true } },
        assignee: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ]);

  const actByType: Record<string, number> = {};
  for (const a of activitiesByType) actByType[a.type] = a._count;

  const totals = {
    newLeads: newLeadsCount,
    activities: Object.values(actByType).reduce((s, n) => s + n, 0),
    callsCount: actByType.CALL ?? 0,
    meetingsCount: actByType.MEETING ?? 0,
    emailsCount: actByType.EMAIL ?? 0,
    messagesCount: (actByType.WHATSAPP ?? 0) + (actByType.TELEGRAM ?? 0),
    notesCount: actByType.NOTE ?? 0,
    stageChanges: stageChangesCount,
    tasksCreated,
    tasksCompleted,
    wonDeals: wonLeads.length,
    lostDeals: lostLeadsCount,
    wonAmount: wonLeads.reduce((s, l) => s + (l.closedAmount ?? 0), 0),
  };

  const ownerIds = new Set<string>();
  for (const r of newLeadsByOwner) if (r.ownerId) ownerIds.add(r.ownerId);
  for (const r of activitiesByUser) if (r.userId) ownerIds.add(r.userId);
  for (const l of wonLeads) if (l.owner?.id) ownerIds.add(l.owner.id);

  const owners = await prisma.user.findMany({
    where: { id: { in: [...ownerIds] } },
    select: { id: true, name: true },
  });
  const nameById = new Map(owners.map((o) => [o.id, o.name]));
  const resolveName = (id: string | null): string =>
    id ? nameById.get(id) ?? "(unknown)" : "(unassigned)";

  type OwnerEntry = WeeklySummaryData["byOwner"][number];
  const ownerMap = new Map<string | null, OwnerEntry>();
  const ensureOwner = (id: string | null): OwnerEntry => {
    let entry = ownerMap.get(id);
    if (!entry) {
      entry = {
        ownerId: id,
        ownerName: resolveName(id),
        newLeads: 0,
        activities: 0,
        wonDeals: 0,
        wonAmount: 0,
      };
      ownerMap.set(id, entry);
    }
    return entry;
  };

  for (const r of newLeadsByOwner) ensureOwner(r.ownerId).newLeads = r._count;
  for (const r of activitiesByUser) ensureOwner(r.userId).activities = r._count;
  for (const l of wonLeads) {
    const e = ensureOwner(l.owner?.id ?? null);
    e.wonDeals++;
    e.wonAmount += l.closedAmount ?? 0;
  }

  const byOwner = [...ownerMap.values()].sort(
    (a, b) =>
      b.wonAmount - a.wonAmount ||
      b.wonDeals - a.wonDeals ||
      b.newLeads - a.newLeads ||
      b.activities - a.activities
  );

  const typeIds = newLeadsByType
    .map((r) => r.leadTypeId)
    .filter((id): id is string => !!id);
  const types = await prisma.leadType.findMany({
    where: { id: { in: typeIds } },
    select: { id: true, name: true },
  });
  const typeNameById = new Map(types.map((t) => [t.id, t.name]));
  const byLeadType = newLeadsByType
    .map((r) => ({
      typeId: r.leadTypeId,
      typeName: r.leadTypeId
        ? typeNameById.get(r.leadTypeId) ?? "(unknown)"
        : "(no type)",
      newLeads: r._count,
    }))
    .sort((a, b) => b.newLeads - a.newLeads);

  const bySource = leadsBySource
    .map((r) => ({ source: (r.source ?? "Unknown") as string, count: r._count }))
    .sort((a, b) => b.count - a.count);

  return {
    totals,
    byOwner,
    byLeadType,
    topNewLeads: topNewLeads.map((l) => ({
      leadId: l.id,
      displayName: l.displayName,
      companyName: l.companyName,
      potentialAmount: l.potentialAmount,
      ownerName: l.owner?.name ?? null,
    })),
    topWins: wonLeads.slice(0, 5).map((l) => ({
      leadId: l.id,
      displayName: l.displayName,
      companyName: l.companyName,
      closedAmount: l.closedAmount,
      ownerName: l.owner?.name ?? null,
    })),
    bySource,
    tasksCompletedList: tasksCompletedDetails.map((t) => ({
      taskId: t.id,
      title: t.title,
      type: t.type,
      priority: t.priority,
      completedAt: (t.completedAt ?? new Date()).toISOString(),
      leadId: t.lead?.id ?? null,
      leadName: t.lead?.displayName ?? null,
      assigneeName: t.assignee?.name ?? null,
    })),
    tasksInProgressList: tasksInProgressDetails.map((t) => ({
      taskId: t.id,
      title: t.title,
      type: t.type,
      priority: t.priority,
      dueAt: t.dueAt?.toISOString() ?? null,
      updatedAt: t.updatedAt.toISOString(),
      leadId: t.lead?.id ?? null,
      leadName: t.lead?.displayName ?? null,
      assigneeName: t.assignee?.name ?? null,
    })),
  };
}

export async function generateAndPersistWeeklySummary(
  weekStart: Date,
  weekEnd: Date
) {
  const data = await computeWeeklySummary(weekStart, weekEnd);
  return prisma.weeklySummary.upsert({
    where: { weekStart },
    create: { weekStart, weekEnd, data: data as object },
    update: { weekEnd, data: data as object, generatedAt: new Date() },
  });
}

export async function notifyAdminsOfWeeklySummary(
  summaryId: string,
  weekStart: Date,
  weekEnd: Date,
  totals: WeeklySummaryData["totals"]
) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", status: "active" },
    select: { id: true },
  });

  const fmt = (d: Date) =>
    `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}`;
  const title = `Weekly summary ready: ${fmt(weekStart)} – ${fmt(weekEnd)}`;
  const message = `${totals.newLeads} new leads, ${totals.activities} activities, ${totals.wonDeals} deals won ($${totals.wonAmount.toLocaleString()})`;

  await prisma.notification.createMany({
    data: admins.map((a) => ({
      userId: a.id,
      type: "SYSTEM" as const,
      title,
      message,
      actionUrl: `/reports/weekly?id=${summaryId}`,
    })),
  });
}
