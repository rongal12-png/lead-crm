import { openai, OPENAI_MODEL } from "../openai";
import { prisma } from "../prisma";
import { ParsedIntent } from "@/types";

const SYSTEM_PROMPT = `You are an AI Sales Operations Assistant inside a CRM system.
Your job is to help sales agents update CRM records, create leads, create tasks, summarize conversations, identify next steps, and surface risks.

You support Hebrew and English input. When the user writes in Hebrew, respond in Hebrew. When in English, respond in English.

You must never invent facts. Use only the user's command and CRM data provided.

For sensitive actions (delete lead, mark won/lost, change owner, merge leads), always set requiresConfirmation: true.

Return ONLY valid JSON with this structure:
{
  "intent": "CreateLead|UpdateLead|MoveStage|AddNote|CreateTask|CompleteTask|SearchLead|SummarizeLead|AssignLead|MarkWon|MarkLost|GeneralQuery",
  "confidence": 0.0-1.0,
  "leadMatch": { "name": "string", "company": "string" } | null,
  "updates": {} | null,
  "note": "string" | null,
  "task": { "title": "string", "type": "CALL|EMAIL|WHATSAPP|MEETING|SEND_DOCS|OTHER", "dueAt": "ISO date" | null, "priority": "LOW|NORMAL|HIGH|URGENT" } | null,
  "newLead": { "displayName": "string", "companyName": "string|null", "leadType": "VC|Leader|Purchaser", "email": "string|null", "phone": "string|null", "source": "string|null", "potentialAmount": number|null, "currency": "USD" } | null,
  "requiresConfirmation": boolean,
  "userFacingSummary": "short human-readable summary of what will happen"
}`;

export async function parseIntent(
  text: string,
  userId: string
): Promise<ParsedIntent> {
  const recentLeads = await prisma.lead.findMany({
    where: { ownerId: userId, status: "ACTIVE" },
    select: { id: true, displayName: true, companyName: true, leadType: { select: { name: true } } },
    orderBy: { lastActivityAt: "desc" },
    take: 20,
  });

  const leadsContext = recentLeads
    .map((l) => `- "${l.displayName}"${l.companyName ? ` (${l.companyName})` : ""} [${l.leadType?.name ?? "Unknown"}] id:${l.id}`)
    .join("\n");

  const userPrompt = `Recent leads in CRM:
${leadsContext || "No leads yet"}

User command: "${text}"

Analyze and return JSON only.`;

  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 1000,
  });

  const raw = response.choices[0]?.message?.content ?? "{}";

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { intent: "GeneralQuery", confidence: 0.3, userFacingSummary: text };
  }

  const leadMatchRaw = parsed.leadMatch as { name?: string; company?: string } | null;
  let resolvedLeadMatch: ParsedIntent["leadMatch"] = null;

  if (leadMatchRaw?.name || leadMatchRaw?.company) {
    const searchTerm = leadMatchRaw.name ?? leadMatchRaw.company ?? "";
    const matchedLead = recentLeads.find(
      (l) =>
        l.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.companyName?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    if (matchedLead) {
      resolvedLeadMatch = {
        leadId: matchedLead.id,
        name: matchedLead.displayName,
        confidence: 0.85,
      };
    }
  }

  const proposedActions: ParsedIntent["proposedActions"] = [];
  const intent = (parsed.intent as string) ?? "GeneralQuery";
  const confidence = (parsed.confidence as number) ?? 0.5;

  if (intent === "CreateLead" && parsed.newLead) {
    proposedActions.push({
      type: "CREATE_LEAD",
      description: `Create new lead: ${(parsed.newLead as { displayName?: string }).displayName}`,
      data: parsed.newLead as Record<string, unknown>,
      sensitive: false,
    });
  }

  if ((intent === "UpdateLead" || intent === "MoveStage") && resolvedLeadMatch) {
    proposedActions.push({
      type: "UPDATE_LEAD",
      description: `Update "${resolvedLeadMatch.name}"`,
      data: (parsed.updates as Record<string, unknown>) ?? {},
      sensitive: false,
    });
  }

  if (intent === "AddNote" && resolvedLeadMatch && parsed.note) {
    proposedActions.push({
      type: "ADD_NOTE",
      description: `Add note to "${resolvedLeadMatch.name}"`,
      data: { note: parsed.note },
      sensitive: false,
    });
  }

  if (intent === "CreateTask") {
    proposedActions.push({
      type: "CREATE_TASK",
      description: `Create task: ${(parsed.task as { title?: string })?.title}`,
      data: (parsed.task as Record<string, unknown>) ?? {},
      sensitive: false,
    });
  }

  if (intent === "MarkWon" || intent === "MarkLost") {
    proposedActions.push({
      type: intent,
      description: `Mark "${resolvedLeadMatch?.name}" as ${intent === "MarkWon" ? "Won" : "Lost"}`,
      data: {},
      sensitive: true,
    });
  }

  return {
    intent,
    confidence,
    leadMatch: resolvedLeadMatch,
    updates: (parsed.updates as Record<string, unknown>) ?? undefined,
    note: (parsed.note as string) ?? undefined,
    task: parsed.task as ParsedIntent["task"] ?? undefined,
    requiresConfirmation: (parsed.requiresConfirmation as boolean) ?? confidence < 0.7,
    userFacingSummary: (parsed.userFacingSummary as string) ?? "Processing...",
    proposedActions,
  };
}
