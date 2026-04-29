import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateLeadScore } from "@/lib/ai/insights";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { stageId } = await req.json();
  if (!stageId) return NextResponse.json({ error: "stageId required" }, { status: 400 });

  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    include: { stage: true },
  });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const newStage = await prisma.stage.findUnique({ where: { id: stageId } });
  if (!newStage) return NextResponse.json({ error: "Stage not found" }, { status: 404 });

  await prisma.lead.update({
    where: { id: params.id },
    data: {
      stageId,
      probability: newStage.probability,
      lastActivityAt: new Date(),
    },
  });

  await prisma.stageHistory.create({
    data: { leadId: params.id, stageId, userId: session.user.id },
  });

  await prisma.activity.create({
    data: {
      leadId: params.id,
      userId: session.user.id,
      type: "STAGE_CHANGE",
      title: `Stage changed to "${newStage.name}"`,
      content: `From: ${lead.stage?.name ?? "Unknown"} → ${newStage.name}`,
    },
  });

  // Check automation rules
  const rules = await prisma.automationRule.findMany({
    where: { trigger: "stage_changed", isActive: true },
  });

  for (const rule of rules) {
    const conditions = rule.conditions as Record<string, string>;
    if (
      conditions.new_stage_name &&
      conditions.new_stage_name !== newStage.name
    ) continue;

    const actions = rule.actions as Array<{ type: string; title?: string; due_in_days?: number; task_type?: string }>;
    for (const action of actions) {
      if (action.type === "create_task" && action.title) {
        const dueAt = action.due_in_days
          ? new Date(Date.now() + action.due_in_days * 24 * 60 * 60 * 1000)
          : undefined;
        await prisma.task.create({
          data: {
            leadId: params.id,
            assignedTo: lead.ownerId ?? session.user.id,
            createdBy: session.user.id,
            title: action.title,
            type: (action.task_type as "CALL" | "EMAIL" | "OTHER") ?? "OTHER",
            dueAt,
          },
        });
      }
    }
  }

  // Recalculate score
  try {
    const score = await calculateLeadScore(params.id);
    await prisma.lead.update({ where: { id: params.id }, data: { aiScore: score } });
  } catch {
    // Non-critical
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: session.user.id,
      entityType: "Lead",
      entityId: params.id,
      action: "MOVE_STAGE",
      before: { stageId: lead.stageId },
      after: { stageId },
    },
  });

  return NextResponse.json({ success: true, data: { stageId, stageName: newStage.name } });
}
