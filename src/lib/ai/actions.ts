import { prisma } from "../prisma";
import { ParsedIntent, AIActionResult } from "@/types";
import { ActivityType, TaskType, TaskPriority } from "@prisma/client";

const SENSITIVE_ACTIONS = new Set(["MarkWon", "MarkLost", "DELETE_LEAD", "CHANGE_OWNER", "MERGE_LEADS"]);

export async function executeIntent(
  intent: ParsedIntent,
  userId: string,
  confirmed = false
): Promise<AIActionResult> {
  const hasSensitive = intent.proposedActions.some((a) => a.sensitive || SENSITIVE_ACTIONS.has(a.type));

  if (hasSensitive && !confirmed) {
    return {
      success: false,
      requiresConfirmation: true,
      confirmationMessage: `This action requires confirmation: ${intent.userFacingSummary}`,
    };
  }

  const results: Record<string, unknown>[] = [];
  const warnings: string[] = [];

  for (const action of intent.proposedActions) {
    try {
      switch (action.type) {
        case "CREATE_LEAD": {
          const newLeadData = action.data as {
            displayName: string;
            companyName?: string;
            leadType?: string;
            email?: string;
            phone?: string;
            source?: string;
            potentialAmount?: number;
            currency?: string;
          };

          const leadType = newLeadData.leadType
            ? await prisma.leadType.findFirst({ where: { name: newLeadData.leadType } })
            : null;

          const pipeline = leadType?.defaultPipelineId
            ? await prisma.pipeline.findUnique({ where: { id: leadType.defaultPipelineId } })
            : null;

          const defaultStage = pipeline
            ? await prisma.stage.findFirst({
                where: { pipelineId: pipeline.id },
                orderBy: { order: "asc" },
              })
            : null;

          const lead = await prisma.lead.create({
            data: {
              displayName: newLeadData.displayName,
              companyName: newLeadData.companyName,
              email: newLeadData.email,
              phone: newLeadData.phone,
              source: newLeadData.source ?? "AI Command",
              leadTypeId: leadType?.id,
              pipelineId: pipeline?.id,
              stageId: defaultStage?.id,
              ownerId: userId,
              createdBy: userId,
              potentialAmount: newLeadData.potentialAmount,
              currency: newLeadData.currency ?? "USD",
              lastActivityAt: new Date(),
            },
          });

          await prisma.activity.create({
            data: {
              leadId: lead.id,
              userId,
              type: ActivityType.LEAD_CREATED,
              title: "Lead created via AI command",
              content: `Lead "${lead.displayName}" created by AI assistant`,
            },
          });

          await prisma.auditLog.create({
            data: {
              actorUserId: userId,
              actorType: "ai",
              entityType: "Lead",
              entityId: lead.id,
              action: "CREATE",
              after: { displayName: lead.displayName },
            },
          });

          results.push({ type: "LEAD_CREATED", leadId: lead.id, displayName: lead.displayName });
          break;
        }

        case "ADD_NOTE": {
          if (!intent.leadMatch?.leadId) {
            warnings.push("Could not find the lead to add a note to");
            break;
          }
          const noteData = action.data as { note: string };
          await prisma.activity.create({
            data: {
              leadId: intent.leadMatch.leadId,
              userId,
              type: ActivityType.NOTE,
              title: "AI Note",
              content: noteData.note,
            },
          });

          await prisma.lead.update({
            where: { id: intent.leadMatch.leadId },
            data: { lastActivityAt: new Date() },
          });

          results.push({ type: "NOTE_ADDED", leadId: intent.leadMatch.leadId });
          break;
        }

        case "CREATE_TASK": {
          const taskData = action.data as {
            title: string;
            type?: string;
            dueAt?: string;
            priority?: string;
          };

          await prisma.task.create({
            data: {
              leadId: intent.leadMatch?.leadId,
              assignedTo: userId,
              createdBy: userId,
              title: taskData.title,
              type: (taskData.type as TaskType) ?? TaskType.OTHER,
              priority: (taskData.priority as TaskPriority) ?? TaskPriority.NORMAL,
              dueAt: taskData.dueAt ? new Date(taskData.dueAt) : undefined,
            },
          });

          if (intent.leadMatch?.leadId) {
            await prisma.activity.create({
              data: {
                leadId: intent.leadMatch.leadId,
                userId,
                type: ActivityType.TASK_CREATED,
                title: `Task created: ${taskData.title}`,
              },
            });
          }

          results.push({ type: "TASK_CREATED", title: taskData.title });
          break;
        }

        case "UPDATE_LEAD": {
          if (!intent.leadMatch?.leadId) {
            warnings.push("Could not identify which lead to update");
            break;
          }
          const updates = action.data as Record<string, unknown>;
          const before = await prisma.lead.findUnique({ where: { id: intent.leadMatch.leadId } });

          await prisma.lead.update({
            where: { id: intent.leadMatch.leadId },
            data: { ...updates, lastActivityAt: new Date() } as Parameters<typeof prisma.lead.update>[0]["data"],
          });

          if (intent.note) {
            await prisma.activity.create({
              data: {
                leadId: intent.leadMatch.leadId,
                userId,
                type: ActivityType.NOTE,
                title: "Update note",
                content: intent.note,
              },
            });
          }

          await prisma.auditLog.create({
            data: {
              actorUserId: userId,
              actorType: "ai",
              entityType: "Lead",
              entityId: intent.leadMatch.leadId,
              action: "UPDATE",
              before,
              after: updates,
            },
          });

          results.push({ type: "LEAD_UPDATED", leadId: intent.leadMatch.leadId });
          break;
        }

        case "MarkWon":
        case "MarkLost": {
          if (!intent.leadMatch?.leadId || !confirmed) break;
          const wonStage = await prisma.stage.findFirst({
            where: {
              pipeline: { leads: { some: { id: intent.leadMatch.leadId } } },
              isWon: action.type === "MarkWon",
              isLost: action.type === "MarkLost",
            },
          });
          if (wonStage) {
            await prisma.lead.update({
              where: { id: intent.leadMatch.leadId },
              data: { stageId: wonStage.id, lastActivityAt: new Date() },
            });
          }
          results.push({ type: action.type, leadId: intent.leadMatch.leadId });
          break;
        }
      }
    } catch (error) {
      warnings.push(`Failed to execute ${action.type}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  return {
    success: true,
    data: { actions: results },
    warnings,
    requiresConfirmation: false,
  };
}
