import { prisma } from "./prisma";

export type BackupPayload = {
  meta: { takenAt: string; appVersion: string };
  users: unknown[];
  leadTypes: unknown[];
  pipelines: unknown[];
  stages: unknown[];
  customFieldDefinitions: unknown[];
  leads: unknown[];
  activities: unknown[];
  tasks: unknown[];
  customFieldValues: unknown[];
  aiInsights: unknown[];
  notifications: unknown[];
  automationRules: unknown[];
  auditLogs: unknown[];
  weeklySummaries: unknown[];
  stageHistories: unknown[];
  kaiTerms: unknown[];
  conversations: unknown[];
  conversationParticipants: unknown[];
  messages: unknown[];
};

export async function buildBackupPayload(): Promise<BackupPayload> {
  const [
    users,
    leadTypes,
    pipelines,
    stages,
    customFieldDefinitions,
    leads,
    activities,
    tasks,
    customFieldValues,
    aiInsights,
    notifications,
    automationRules,
    auditLogs,
    weeklySummaries,
    stageHistories,
    kaiTerms,
    conversations,
    conversationParticipants,
    messages,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.leadType.findMany(),
    prisma.pipeline.findMany(),
    prisma.stage.findMany(),
    prisma.customFieldDefinition.findMany(),
    prisma.lead.findMany(),
    prisma.activity.findMany(),
    prisma.task.findMany(),
    prisma.customFieldValue.findMany(),
    prisma.aIInsight.findMany(),
    prisma.notification.findMany(),
    prisma.automationRule.findMany(),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 5000,
    }),
    prisma.weeklySummary.findMany(),
    prisma.stageHistory.findMany(),
    prisma.kaiTerms.findMany(),
    prisma.conversation.findMany(),
    prisma.conversationParticipant.findMany(),
    prisma.message.findMany({ orderBy: { createdAt: "desc" }, take: 50000 }),
  ]);

  return {
    meta: { takenAt: new Date().toISOString(), appVersion: "1.0.2" },
    users,
    leadTypes,
    pipelines,
    stages,
    customFieldDefinitions,
    leads,
    activities,
    tasks,
    customFieldValues,
    aiInsights,
    notifications,
    automationRules,
    auditLogs,
    weeklySummaries,
    stageHistories,
    kaiTerms,
    conversations,
    conversationParticipants,
    messages,
  };
}

export function summarizeCounts(p: BackupPayload): Record<string, number> {
  return {
    users: p.users.length,
    leadTypes: p.leadTypes.length,
    pipelines: p.pipelines.length,
    stages: p.stages.length,
    customFieldDefinitions: p.customFieldDefinitions.length,
    leads: p.leads.length,
    activities: p.activities.length,
    tasks: p.tasks.length,
    customFieldValues: p.customFieldValues.length,
    aiInsights: p.aiInsights.length,
    notifications: p.notifications.length,
    automationRules: p.automationRules.length,
    auditLogs: p.auditLogs.length,
    weeklySummaries: p.weeklySummaries.length,
    stageHistories: p.stageHistories.length,
    kaiTerms: p.kaiTerms.length,
    conversations: p.conversations.length,
    conversationParticipants: p.conversationParticipants.length,
    messages: p.messages.length,
  };
}

const RETENTION_DAYS = 30;

export async function createBackupSnapshot(opts: {
  triggeredBy: "cron" | "manual";
  triggeredById?: string;
}) {
  const payload = await buildBackupPayload();
  const counts = summarizeCounts(payload);
  const serialized = JSON.stringify(payload);
  const sizeBytes = Buffer.byteLength(serialized, "utf8");

  const snapshot = await prisma.backupSnapshot.create({
    data: {
      triggeredBy: opts.triggeredBy,
      triggeredById: opts.triggeredById,
      entityCounts: counts,
      sizeBytes,
      data: payload as unknown as object,
    },
  });

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.backupSnapshot.deleteMany({
    where: { createdAt: { lt: cutoff }, triggeredBy: "cron" },
  });

  return { id: snapshot.id, counts, sizeBytes };
}
