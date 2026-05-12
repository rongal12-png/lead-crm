import { openai, OPENAI_MODEL } from "../openai";
import { prisma } from "../prisma";
import type { WeeklySummaryData } from "../weekly-summary";

export type NarrativeLang = "he" | "en";

export type NarrativeContent = {
  headline: string;
  executiveSummary: string;
  leadAcquisition: string;
  pipelineProgress: string;
  tasksWork: string;
  highlights: string[];
  concerns: string[];
  recommendations: string[];
};

export type WeeklyNarrative = {
  he: NarrativeContent;
  en: NarrativeContent;
  model: string;
  generatedAt: string;
};

const SCHEMA_DESCRIPTION = `Return a single JSON object that matches this TypeScript type EXACTLY (no markdown fences, no extra keys):
{
  "headline": string,            // 6-10 words, the single most important takeaway of the week
  "executiveSummary": string,    // 3-5 sentence overview connecting the numbers into a story
  "leadAcquisition": string,     // 2-4 sentences about new leads added: volume, by type, by source, biggest opportunities
  "pipelineProgress": string,    // 2-4 sentences about stage movement, activities, deals won/lost, and momentum
  "tasksWork": string,           // 2-4 sentences about tasks created vs completed, who delivered, and what is still in progress
  "highlights": string[],        // 3-5 short bullets celebrating real wins (each <= 18 words)
  "concerns": string[],          // 1-4 short bullets flagging risks, slowdowns, or gaps (each <= 18 words)
  "recommendations": string[]    // 3-5 short, concrete action items for next week (each <= 18 words)
}`;

const SYSTEM_HE = `אתה אנליסט מכירות בכיר שכותב סיכום שבועי מקצועי, מנוסח היטב ובעברית תקנית עבור מנהל CRM.
- כתוב בעברית בלבד. אל תשתמש באנגלית למעט מספרים ומטבעות.
- היה ספציפי: השתמש במספרים מהנתונים, שמות לידים אמיתיים, שמות סוכנים ושמות שלבים.
- כתוב בטון מקצועי, חיובי וביצועי – לא יבש ולא יחצן.
- אם השבוע היה שקט, אמור זאת בכנות והצע מה לעשות בשבוע הבא.
- אסור לך להמציא מספרים שלא קיימים בנתונים.
- החזר JSON תקני בלבד, ללא הסברים, ללא הקדמה, ללא קוד מארק-דאון.`;

const SYSTEM_EN = `You are a senior sales analyst writing a polished weekly summary for a CRM manager.
- Write in clear, professional English.
- Be specific: cite real numbers, real lead names, agent names, and stage names from the data.
- Tone: professional, action-oriented, honest — not dry, not hype.
- If the week was quiet, say so honestly and recommend what to focus on next week.
- Do not invent any numbers that are not present in the data.
- Return valid JSON only. No prose preamble, no markdown fences.`;

function buildDataDigest(data: WeeklySummaryData, weekStart: Date, weekEnd: Date): string {
  const t = data.totals;
  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

  const lines: string[] = [];
  lines.push(`Week range: ${fmtDate(weekStart)} – ${fmtDate(weekEnd)}`);
  lines.push("");
  lines.push("TOTALS:");
  lines.push(`- New leads added: ${t.newLeads}`);
  lines.push(`- Activities logged: ${t.activities} (calls ${t.callsCount}, meetings ${t.meetingsCount}, emails ${t.emailsCount}, messages ${t.messagesCount}, notes ${t.notesCount})`);
  lines.push(`- Pipeline stage changes: ${t.stageChanges}`);
  lines.push(`- Tasks created: ${t.tasksCreated}, completed: ${t.tasksCompleted}`);
  lines.push(`- Deals won: ${t.wonDeals} ($${t.wonAmount.toLocaleString()})`);
  lines.push(`- Deals lost: ${t.lostDeals}`);

  if (data.byOwner.length > 0) {
    lines.push("");
    lines.push("BY AGENT (top 8):");
    for (const o of data.byOwner.slice(0, 8)) {
      lines.push(`- ${o.ownerName}: ${o.newLeads} new leads, ${o.activities} activities, ${o.wonDeals} won ($${o.wonAmount.toLocaleString()})`);
    }
  }

  if (data.byLeadType.length > 0) {
    lines.push("");
    lines.push("NEW LEADS BY TYPE:");
    for (const t of data.byLeadType) lines.push(`- ${t.typeName}: ${t.newLeads}`);
  }

  if (data.bySource.length > 0) {
    lines.push("");
    lines.push("NEW LEADS BY SOURCE:");
    for (const s of data.bySource.slice(0, 8)) lines.push(`- ${s.source}: ${s.count}`);
  }

  if (data.topNewLeads.length > 0) {
    lines.push("");
    lines.push("TOP NEW LEADS (by potential):");
    for (const l of data.topNewLeads) {
      const amt = l.potentialAmount ? `$${l.potentialAmount.toLocaleString()}` : "no amount";
      lines.push(`- ${l.displayName}${l.companyName ? ` (${l.companyName})` : ""} — ${amt}, owner: ${l.ownerName ?? "unassigned"}`);
    }
  }

  if (data.topWins.length > 0) {
    lines.push("");
    lines.push("TOP WINS THIS WEEK:");
    for (const l of data.topWins) {
      const amt = l.closedAmount ? `$${l.closedAmount.toLocaleString()}` : "no amount";
      lines.push(`- ${l.displayName}${l.companyName ? ` (${l.companyName})` : ""} — ${amt}, owner: ${l.ownerName ?? "unassigned"}`);
    }
  }

  if (data.tasksCompletedList && data.tasksCompletedList.length > 0) {
    lines.push("");
    lines.push(`TASKS COMPLETED (showing first 15 of ${data.tasksCompletedList.length}):`);
    for (const t of data.tasksCompletedList.slice(0, 15)) {
      lines.push(`- "${t.title}" [${t.type}/${t.priority}] by ${t.assigneeName ?? "—"}${t.leadName ? `, lead: ${t.leadName}` : ""}`);
    }
  }

  if (data.tasksInProgressList && data.tasksInProgressList.length > 0) {
    lines.push("");
    lines.push(`TASKS IN PROGRESS (showing first 15 of ${data.tasksInProgressList.length}):`);
    for (const t of data.tasksInProgressList.slice(0, 15)) {
      const due = t.dueAt ? new Date(t.dueAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "no due date";
      lines.push(`- "${t.title}" [${t.type}/${t.priority}] by ${t.assigneeName ?? "—"}, due ${due}${t.leadName ? `, lead: ${t.leadName}` : ""}`);
    }
  }

  return lines.join("\n");
}

async function generateOne(
  data: WeeklySummaryData,
  weekStart: Date,
  weekEnd: Date,
  lang: NarrativeLang
): Promise<NarrativeContent> {
  const digest = buildDataDigest(data, weekStart, weekEnd);
  const system = lang === "he" ? SYSTEM_HE : SYSTEM_EN;
  const userPreamble =
    lang === "he"
      ? `הנתונים השבועיים מופיעים למטה. כתוב סיכום עשיר ויפה ב-JSON המתאים לסכמה המבוקשת.\n\n${SCHEMA_DESCRIPTION}\n\nDATA:\n${digest}`
      : `The week's data is below. Write a rich, well-crafted summary as JSON matching the requested schema.\n\n${SCHEMA_DESCRIPTION}\n\nDATA:\n${digest}`;

  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0.4,
    max_tokens: 1400,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: userPreamble },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  let parsed: Partial<NarrativeContent> = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }

  const ensureStr = (v: unknown, fallback: string): string =>
    typeof v === "string" && v.trim().length > 0 ? v.trim() : fallback;
  const ensureArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim()) : [];

  const empty = lang === "he" ? "—" : "—";

  return {
    headline: ensureStr(parsed.headline, empty),
    executiveSummary: ensureStr(parsed.executiveSummary, empty),
    leadAcquisition: ensureStr(parsed.leadAcquisition, empty),
    pipelineProgress: ensureStr(parsed.pipelineProgress, empty),
    tasksWork: ensureStr(parsed.tasksWork, empty),
    highlights: ensureArr(parsed.highlights),
    concerns: ensureArr(parsed.concerns),
    recommendations: ensureArr(parsed.recommendations),
  };
}

export async function generateWeeklyNarrative(
  data: WeeklySummaryData,
  weekStart: Date,
  weekEnd: Date
): Promise<WeeklyNarrative> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const [he, en] = await Promise.all([
    generateOne(data, weekStart, weekEnd, "he"),
    generateOne(data, weekStart, weekEnd, "en"),
  ]);

  return {
    he,
    en,
    model: OPENAI_MODEL,
    generatedAt: new Date().toISOString(),
  };
}

export async function generateAndPersistWeeklyNarrative(
  summaryId: string
): Promise<WeeklyNarrative> {
  const row = await prisma.weeklySummary.findUnique({ where: { id: summaryId } });
  if (!row) throw new Error("Summary not found");

  const narrative = await generateWeeklyNarrative(
    row.data as unknown as WeeklySummaryData,
    row.weekStart,
    row.weekEnd
  );

  await prisma.weeklySummary.update({
    where: { id: summaryId },
    data: { narrative: JSON.stringify(narrative) },
  });

  return narrative;
}

export function parseNarrative(raw: string | null | undefined): WeeklyNarrative | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.he && parsed.en) {
      return parsed as WeeklyNarrative;
    }
  } catch {
    return null;
  }
  return null;
}
