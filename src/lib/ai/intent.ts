import { anthropic, ANTHROPIC_MODEL, extractText, extractJSON } from "../anthropic";
import { prisma } from "../prisma";
import { ParsedIntent } from "@/types";

const SYSTEM_PROMPT = `You are an AI assistant for a sales CRM. Your job is to help sales reps update records, create leads, schedule tasks, and summarize conversations.

Important:
- Respond in the same language the user used (English by default; Hebrew if the user wrote in Hebrew). The userFacingSummary must match the user's language.
- Use lead names exactly as written (do not translate proper names).
- Do not invent facts — use only the data provided.
- For sensitive actions (delete, mark Won/Lost, change owner) always set requiresConfirmation: true.

Return JSON only, in this shape:
{
  "intent": "CreateLead|UpdateLead|MoveStage|AddNote|CreateTask|CompleteTask|SearchLead|SummarizeLead|AssignLead|MarkWon|MarkLost|GeneralQuery",
  "confidence": 0.0-1.0,
  "leadMatch": { "name": "string", "company": "string" } | null,
  "updates": {} | null,
  "note": "string" | null,
  "task": { "title": "string", "type": "CALL|EMAIL|WHATSAPP|MEETING|SEND_DOCS|OTHER", "dueAt": "ISO date" | null, "priority": "LOW|NORMAL|HIGH|URGENT" } | null,
  "newLead": { "displayName": "string", "companyName": "string|null", "leadType": "VC|Leader|Purchaser", "email": "string|null", "phone": "string|null", "source": "string|null", "potentialAmount": number|null, "currency": "USD" } | null,
  "requiresConfirmation": boolean,
  "userFacingSummary": "short summary of what will be done, in the user's language"
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

  const userPrompt = `Recent leads in the system:
${leadsContext || "No leads yet"}

User command: "${text}"

Analyze and return JSON only.`;

  const response = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 1000,
    temperature: 0.1,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const raw = extractText(response.content);
  const parsed: Record<string, unknown> =
    extractJSON<Record<string, unknown>>(raw) ??
    { intent: "GeneralQuery", confidence: 0.3, userFacingSummary: text };

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
      description: `Update lead: "${resolvedLeadMatch.name}"`,
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
