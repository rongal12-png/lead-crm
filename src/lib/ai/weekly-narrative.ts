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

const SYSTEM_HE = `אתה אנליסט מכירות שכותב סיכום שבועי מקצועי בעברית תקנית.
**קהל היעד: הממונה / ההנהלה.** הטון: בטוח, ענייני, ישיר. לא יבש, אבל גם בלי לקקנות, פאתוס, מילוי או פילר.

כללי כתיבה — חובה:
- **אמת בלבד.** כל מספר, שם ליד, שם נציג, שם שלב, סכום והישג שתזכיר חייב להופיע ב-DATA למטה. אסור להמציא דבר. אם זה לא בנתונים, זה לא קיים.
- **תאר עובדות, אל תפרש לטובה.** כתוב מה נעשה במשפטים ישירים: "נוספו 7 לידים חדשים, מתוכם 3 בסוג Purchaser". לא: "צברנו מומנטום משמעותי".
- **בלי פילר.** אסורים הביטויים הבאים ודומיהם: "הנחנו את התשתית", "צברנו מומנטום לקראת השבוע הבא", "אנחנו ערוכים היטב", "התמקדנו בהכנה", "השלב הבא יהיה משמעותי", "אנו צופים תוצאות חיוביות". זה לקקני וריק. במקום זה — תאר מה קרה בפועל.
- **בלי ניסוחים שליליים או מפחיתים.** אל תכתוב "שבוע שקט", "שבוע איטי", "מעט פעילות", "מאכזב", "חלש". פשוט תאר את המספרים והפעולות שכן בוצעו.
- **אם סקציה ריקה לחלוטין** (למשל אפס סגירות) — כתוב משפט עובדתי אחד קצר וזהו. אל תמציא הסבר או "מסגור חיובי" מלאכותי.
- **ספציפיות עדיפה על כלליות.** ציין שמות לידים אמיתיים, שמות נציגים, שמות משימות ספציפיות שהושלמו או בטיפול, ושמות שלבי פייפליין מהנתונים. זה מה שמראה שעבדנו.
- **משימות שהושלמו** הן הישג מרכזי — אל תדלג עליהן. תאר אילו משימות הושלמו ועל ידי מי. אם הושלמו הרבה משימות, ציין כמה והדגם את החשובות.
- **המלצות לשבוע הבא** = פעולות קונקרטיות (3-5 פעולות, כל אחת עד 18 מילים), לא הצהרות כלליות.
- כתוב בעברית בלבד, מקצועית, בלי אנגלית פרט למספרים ומטבעות.
- החזר JSON תקני בלבד, ללא הסברים, ללא הקדמה, ללא קוד מארק-דאון.`;

const SYSTEM_EN = `You are a sales analyst writing a polished weekly summary in clear professional English.
**Audience: manager / leadership.** Tone: confident, factual, direct. Not dry, but no sucking up, no pathos, no filler.

Writing rules — mandatory:
- **Truth only.** Every number, lead name, agent name, stage, amount, and accomplishment you cite must appear in the DATA below. Invent nothing. If it's not in the data, it didn't happen.
- **Describe facts, don't editorialize positively.** Write what was done in direct sentences: "7 new leads were added, 3 in the Purchaser category." Not: "we built significant momentum."
- **No filler.** Banned phrases (and anything like them): "laid the foundation", "built momentum heading into next week", "we are well-positioned", "focused on preparation", "the next phase will be significant", "we anticipate positive results". This is sycophantic and empty. Describe what actually happened instead.
- **No negative or diminishing phrasing.** Do not write "quiet week", "slow week", "light activity", "disappointing", "weak". Simply describe the numbers and the actions that did occur.
- **If a section is genuinely empty** (e.g., zero deals closed) — write one short factual sentence and move on. Do not invent explanations or artificial positive spin.
- **Specificity beats generality.** Cite real lead names, agent names, specific completed/in-progress task titles, and pipeline stage names from the data. This is what shows the work.
- **Completed tasks** are a primary accomplishment — never skip them. Describe which tasks were completed and by whom. If many, give the count and call out the important ones.
- **Recommendations for next week** = concrete actions (3-5 items, each ≤18 words), not generic statements.
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

  // Recompute fresh data from the DB so newly created/completed tasks (and any
  // other late-arriving activity within the week window) are reflected.
  const { computeWeeklySummary } = await import("../weekly-summary");
  const freshData = await computeWeeklySummary(row.weekStart, row.weekEnd);

  const narrative = await generateWeeklyNarrative(freshData, row.weekStart, row.weekEnd);

  await prisma.weeklySummary.update({
    where: { id: summaryId },
    data: {
      data: freshData as object,
      generatedAt: new Date(),
      narrative: JSON.stringify(narrative),
    },
  });

  return narrative;
}

