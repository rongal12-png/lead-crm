import { prisma } from "../prisma";
import { AIInsightType, AIInsightSeverity, AIInsightStatus } from "@prisma/client";
import { openai, OPENAI_MODEL } from "../openai";

export async function generateLeadSummary(leadId: string): Promise<string> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      leadType: true,
      stage: true,
      pipeline: true,
      owner: { select: { name: true } },
      activities: {
        orderBy: { occurredAt: "desc" },
        take: 5,
      },
      tasks: {
        where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
        take: 3,
      },
    },
  });

  if (!lead) return "Lead not found";

  const prompt = `You are a sales AI assistant. Summarize this lead in 3-4 sentences. Be direct and actionable.

Lead: ${lead.displayName}
Type: ${lead.leadType?.name ?? "Unknown"}
Company: ${lead.companyName ?? "—"}
Stage: ${lead.stage?.name ?? "Unknown"}
Potential: $${lead.potentialAmount?.toLocaleString() ?? "Unknown"}
Committed: $${lead.committedAmount?.toLocaleString() ?? "—"}
Priority: ${lead.priority}
AI Score: ${lead.aiScore ?? "—"}/100
Last activity: ${lead.lastActivityAt ? new Date(lead.lastActivityAt).toLocaleDateString() : "Never"}
Next follow-up: ${lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt).toLocaleDateString() : "Not set"}

Recent activities:
${lead.activities.map((a) => `- [${a.type}] ${a.title ?? ""}: ${a.content?.slice(0, 100) ?? ""}`).join("\n") || "No recent activities"}

Open tasks:
${lead.tasks.map((t) => `- ${t.title} (due: ${t.dueAt ? new Date(t.dueAt).toLocaleDateString() : "no date"})`).join("\n") || "No open tasks"}

Write a concise summary covering: who they are, current status, last interaction, risk level, and recommended next action.`;

  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    max_tokens: 400,
    temperature: 0.3,
    messages: [{ role: "user", content: prompt }],
  });

  return response.choices[0]?.message?.content ?? "Unable to generate summary";
}

export async function runInsightsJob(): Promise<number> {
  let insightsCreated = 0;

  // 1. Inactivity alerts — leads not updated in 4+ days
  const staleLeads = await prisma.lead.findMany({
    where: {
      status: "ACTIVE",
      lastActivityAt: { lt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
      stage: { isWon: false, isLost: false },
    },
    include: { owner: { select: { id: true } }, stage: true, leadType: true },
    take: 50,
  });

  for (const lead of staleLeads) {
    const existing = await prisma.aIInsight.findFirst({
      where: {
        leadId: lead.id,
        type: AIInsightType.INACTIVITY_ALERT,
        status: AIInsightStatus.ACTIVE,
        createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (existing) continue;

    const daysAgo = Math.floor((Date.now() - new Date(lead.lastActivityAt ?? lead.createdAt).getTime()) / (24 * 60 * 60 * 1000));

    await prisma.aIInsight.create({
      data: {
        leadId: lead.id,
        userId: lead.ownerId ?? undefined,
        type: AIInsightType.INACTIVITY_ALERT,
        severity: daysAgo > 7 ? AIInsightSeverity.HIGH : AIInsightSeverity.MEDIUM,
        title: `No activity for ${daysAgo} days`,
        message: `Lead "${lead.displayName}" (${lead.leadType?.name ?? "Unknown"}) has not been updated in ${daysAgo} days. Current stage: ${lead.stage?.name ?? "Unknown"}.`,
        recommendedAction: "Schedule a follow-up call or send a check-in message",
      },
    });

    if (lead.ownerId) {
      await prisma.notification.create({
        data: {
          userId: lead.ownerId,
          leadId: lead.id,
          type: "LEAD_INACTIVE",
          title: `Lead inactive for ${daysAgo} days`,
          message: `"${lead.displayName}" hasn't been updated in ${daysAgo} days`,
          actionUrl: `/leads/${lead.id}`,
        },
      });
    }

    insightsCreated++;
  }

  // 2. Hot leads — high score + recent commitment
  const hotLeads = await prisma.lead.findMany({
    where: {
      status: "ACTIVE",
      aiScore: { gte: 75 },
      committedAmount: { gt: 0 },
      stage: { isWon: false, isLost: false },
    },
    include: { owner: { select: { id: true } } },
    take: 20,
  });

  for (const lead of hotLeads) {
    const existing = await prisma.aIInsight.findFirst({
      where: {
        leadId: lead.id,
        type: AIInsightType.HOT_LEAD,
        status: AIInsightStatus.ACTIVE,
        createdAt: { gt: new Date(Date.now() - 6 * 60 * 60 * 1000) },
      },
    });
    if (existing) continue;

    await prisma.aIInsight.create({
      data: {
        leadId: lead.id,
        userId: lead.ownerId ?? undefined,
        type: AIInsightType.HOT_LEAD,
        severity: AIInsightSeverity.HIGH,
        title: "Hot lead — take action now",
        message: `"${lead.displayName}" has a high AI score (${lead.aiScore}/100) and committed $${lead.committedAmount?.toLocaleString()}. This is a great opportunity to close.`,
        recommendedAction: "Call now to confirm commitment and send payment/contract details",
      },
    });
    insightsCreated++;
  }

  // 3. Pipeline stuck — leads in same stage for 10+ days
  const stuckLeads = await prisma.lead.findMany({
    where: {
      status: "ACTIVE",
      stage: { isWon: false, isLost: false },
      updatedAt: { lt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
      potentialAmount: { gt: 10000 },
    },
    include: { stage: true, owner: { select: { id: true } } },
    take: 20,
  });

  for (const lead of stuckLeads) {
    const existing = await prisma.aIInsight.findFirst({
      where: {
        leadId: lead.id,
        type: AIInsightType.PIPELINE_STUCK,
        status: AIInsightStatus.ACTIVE,
        createdAt: { gt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
      },
    });
    if (existing) continue;

    await prisma.aIInsight.create({
      data: {
        leadId: lead.id,
        userId: lead.ownerId ?? undefined,
        type: AIInsightType.PIPELINE_STUCK,
        severity: AIInsightSeverity.MEDIUM,
        title: `Stuck in "${lead.stage?.name}" for 10+ days`,
        message: `"${lead.displayName}" has been in stage "${lead.stage?.name}" for over 10 days with $${lead.potentialAmount?.toLocaleString()} potential.`,
        recommendedAction: "Identify blockers and push to next stage or mark as lost",
      },
    });
    insightsCreated++;
  }

  return insightsCreated;
}

export async function calculateLeadScore(leadId: string): Promise<number> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      activities: { select: { type: true, createdAt: true }, take: 30 },
      tasks: { select: { status: true }, take: 10 },
      stage: { select: { probability: true, isWon: true } },
    },
  });

  if (!lead) return 0;

  let score = 0;

  // Stage probability
  score += (lead.stage?.probability ?? 0) * 0.3;

  // Potential amount
  if ((lead.potentialAmount ?? 0) > 100000) score += 20;
  else if ((lead.potentialAmount ?? 0) > 50000) score += 15;
  else if ((lead.potentialAmount ?? 0) > 10000) score += 10;
  else if ((lead.potentialAmount ?? 0) > 0) score += 5;

  // Commitment
  if (lead.committedAmount && lead.committedAmount > 0) score += 15;

  // Activity count
  const activityCount = lead.activities.length;
  if (activityCount > 10) score += 15;
  else if (activityCount > 5) score += 10;
  else if (activityCount > 2) score += 5;

  // Recency
  const daysSinceActivity = lead.lastActivityAt
    ? (Date.now() - new Date(lead.lastActivityAt).getTime()) / (24 * 60 * 60 * 1000)
    : 999;

  if (daysSinceActivity <= 1) score += 10;
  else if (daysSinceActivity <= 3) score += 7;
  else if (daysSinceActivity <= 7) score += 3;
  else if (daysSinceActivity > 14) score -= 10;

  // Priority
  if (lead.priority === "URGENT") score += 10;
  else if (lead.priority === "HIGH") score += 7;
  else if (lead.priority === "MEDIUM") score += 3;

  return Math.max(0, Math.min(100, Math.round(score)));
}
