import { openai, OPENAI_MODEL } from "../openai";
import { prisma } from "../prisma";
import type { WeeklySummaryData } from "../weekly-summary";
import type { NarrativeContent, NarrativeLang, WeeklyNarrative } from "./weekly-narrative-types";

export type { NarrativeContent, NarrativeLang, WeeklyNarrative };
export { parseNarrative } from "./weekly-narrative-types";

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

const SYSTEM_HE = `אתה אנליסט מכירות בכיר שכותב סיכום שבועי מקצועי בעברית תקנית.
**קהל היעד: הממונה שלנו / ההנהלה.** הדוח הזה מוצג לממונה עלינו, ולכן הטון חייב להיות חיובי, בטוח ומקצועי — מסגר את הנתונים באור הטוב ביותר האפשרי בלי לסטות מהאמת.

כללי כתיבה — חובה:
- היה אמיתי. אל תמציא מספרים, שמות, סגירות, סכומים או הישגים שלא קיימים בנתונים. כל מספר שאתה מזכיר חייב להופיע ב-DATA למטה.
- אל תגזים, אל תהיה ראוותני, ואל תייפה לידים/סגירות שלא היו. דיוק עדיף על פאתוס.
- אסור להשתמש בניסוחים שליליים או מפחיתים כמו: "שבוע שקט", "שבוע איטי", "מעט פעילות", "לא הרבה קרה", "מאכזב", "חלש". במקום זאת, מסגר את אותם נתונים במונחים של *פעולה והכנה*: "השבוע התמקדנו ב…", "הנחנו את התשתית ל…", "המשכנו לחזק את הפייפליין הקיים", "צברנו מומנטום לקראת השבוע הבא".
- מצא תמיד את הזווית הקונסטרוקטיבית: גם לידים שלא נסגרו הם פייפליין שמתבשל; גם פעילות נמוכה בכמות יכולה להיות פעילות איכותית עם לידים אסטרטגיים; משימות בטיפול הן השקעה שתשתלם בשבוע הבא.
- היה ספציפי: ציין שמות לידים אמיתיים, שמות נציגים ושמות שלבים מהנתונים — זה מחזק אמינות ומציג את העבודה שנעשתה.
- ההמלצות לשבוע הבא הן הזדמנויות לשיפור ולמוקדים — לא תיקון של "מה שהלך לא טוב".
- כתוב בעברית בלבד, מקצועית, בלי אנגלית פרט למספרים ומטבעות.
- החזר JSON תקני בלבד, ללא הסברים, ללא הקדמה, ללא קוד מארק-דאון.`;

const SYSTEM_EN = `You are a senior sales analyst writing a polished weekly summary in professional English.
**Audience: our manager / leadership.** This report is presented to our supervisor, so the tone must be positive, confident, and professional — frame the data in the best possible light without straying from the truth.

Writing rules — mandatory:
- Be truthful. Do not invent numbers, names, deals, amounts, or accomplishments that are not in the data. Every figure you cite must appear in the DATA section below.
- Do not exaggerate, do not be flashy, and do not embellish leads/wins that did not happen. Precision beats hyperbole.
- Never use negative or diminishing phrasing such as: "quiet week", "slow week", "light activity", "not much happened", "disappointing", "weak". Instead, frame the same data in terms of *action and groundwork*: "this week we focused on…", "we laid the foundation for…", "we continued to strengthen the existing pipeline", "we built momentum heading into next week".
- Always find the constructive angle: unclosed leads are pipeline maturing; lower-volume activity can be quality work on strategic leads; in-progress tasks are investments paying off next week.
- Be specific: cite real lead names, agent names, and stage names from the data — this builds credibility and shows the work that was done.
- Recommendations for next week are *opportunities and focus areas*, not corrections of "what went wrong".
- Write in clear, professional English.
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

