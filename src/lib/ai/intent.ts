import { anthropic, ANTHROPIC_MODEL, extractText, extractJSON } from "../anthropic";
import { prisma } from "../prisma";
import { ParsedIntent } from "@/types";

const SYSTEM_PROMPT = `אתה עוזר AI למערכת CRM ישראלית לניהול לידים.
תפקידך לעזור לאנשי מכירות לעדכן רשומות, ליצור לידים, לתזמן משימות, ולסכם שיחות.

חשוב מאוד:
- תמיד ענה בעברית — גם אם הפקודה באנגלית
- השתמש בשמות הלידים כפי שהם (שמות פרטיים לא לתרגם)
- אל תמציא עובדות — השתמש רק בנתונים שניתנו לך
- לפעולות רגישות (מחיקה, סגירה כ-Won/Lost, שינוי בעלים) — תמיד requiresConfirmation: true

החזר JSON בלבד במבנה הזה:
{
  "intent": "CreateLead|UpdateLead|MoveStage|AddNote|CreateTask|CompleteTask|SearchLead|SummarizeLead|AssignLead|MarkWon|MarkLost|GeneralQuery",
  "confidence": 0.0-1.0,
  "leadMatch": { "name": "string", "company": "string" } | null,
  "updates": {} | null,
  "note": "string" | null,
  "task": { "title": "string", "type": "CALL|EMAIL|WHATSAPP|MEETING|SEND_DOCS|OTHER", "dueAt": "ISO date" | null, "priority": "LOW|NORMAL|HIGH|URGENT" } | null,
  "newLead": { "displayName": "string", "companyName": "string|null", "leadType": "VC|Leader|Purchaser", "email": "string|null", "phone": "string|null", "source": "string|null", "potentialAmount": number|null, "currency": "USD" } | null,
  "requiresConfirmation": boolean,
  "userFacingSummary": "תקציר קצר בעברית של מה שייעשה"
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

  const userPrompt = `לידים אחרונים במערכת:
${leadsContext || "אין לידים עדיין"}

פקודת המשתמש: "${text}"

נתח והחזר JSON בלבד.`;

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
      description: `יצירת ליד חדש: ${(parsed.newLead as { displayName?: string }).displayName}`,
      data: parsed.newLead as Record<string, unknown>,
      sensitive: false,
    });
  }

  if ((intent === "UpdateLead" || intent === "MoveStage") && resolvedLeadMatch) {
    proposedActions.push({
      type: "UPDATE_LEAD",
      description: `עדכון ליד: "${resolvedLeadMatch.name}"`,
      data: (parsed.updates as Record<string, unknown>) ?? {},
      sensitive: false,
    });
  }

  if (intent === "AddNote" && resolvedLeadMatch && parsed.note) {
    proposedActions.push({
      type: "ADD_NOTE",
      description: `הוספת הערה ל"${resolvedLeadMatch.name}"`,
      data: { note: parsed.note },
      sensitive: false,
    });
  }

  if (intent === "CreateTask") {
    proposedActions.push({
      type: "CREATE_TASK",
      description: `יצירת משימה: ${(parsed.task as { title?: string })?.title}`,
      data: (parsed.task as Record<string, unknown>) ?? {},
      sensitive: false,
    });
  }

  if (intent === "MarkWon" || intent === "MarkLost") {
    proposedActions.push({
      type: intent,
      description: `סימון "${resolvedLeadMatch?.name}" כ${intent === "MarkWon" ? "עסקה שנסגרה" : "עסקה שנכשלה"}`,
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
