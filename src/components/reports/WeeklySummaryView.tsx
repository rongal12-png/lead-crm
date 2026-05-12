"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  RefreshCw,
  Loader2,
  TrendingUp,
  Users,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  CheckSquare,
  ArrowRight,
  Trophy,
  Sparkles,
  Download,
  FileText,
  History,
  AlertTriangle,
  Lightbulb,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import type { WeeklySummaryData } from "@/lib/weekly-summary";
import {
  parseNarrative,
  type WeeklyNarrative,
  type NarrativeContent,
  type NarrativeLang,
} from "@/lib/ai/weekly-narrative";

type Summary = {
  id: string;
  weekStart: string;
  weekEnd: string;
  generatedAt: string;
  data: WeeklySummaryData;
  narrative: string | null;
};

interface Props {
  initialSummaries: Summary[];
  isAdmin: boolean;
}

function fmtDate(d: string | Date, lang: NarrativeLang = "en"): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const locale = lang === "he" ? "he-IL" : "en-GB";
  return date.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function fmtCurrency(n: number, lang: NarrativeLang = "en"): string {
  if (n === 0) return lang === "he" ? "0 ₪" : "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

const TILE_COLORS: Record<string, { bg: string; fg: string }> = {
  indigo: { bg: "#eef2ff", fg: "#4338ca" },
  green: { bg: "#dcfce7", fg: "#15803d" },
  rose: { bg: "#fee2e2", fg: "#b91c1c" },
  amber: { bg: "#fef3c7", fg: "#a16207" },
  cyan: { bg: "#cffafe", fg: "#0e7490" },
  purple: { bg: "#f3e8ff", fg: "#7e22ce" },
};

function StatTile({
  label,
  value,
  icon: Icon,
  color = "indigo",
  hint,
}: {
  label: string;
  value: string | number;
  icon: typeof TrendingUp;
  color?: keyof typeof TILE_COLORS;
  hint?: string;
}) {
  const c = TILE_COLORS[color];
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: c.bg }}
      >
        <Icon className="w-5 h-5" style={{ color: c.fg }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{label}</p>
        <p className="text-2xl font-black text-gray-900 mt-0.5 leading-tight">{value}</p>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}

const UI_STRINGS = {
  he: {
    pageHint: "סיכום שבועי מבוסס AI עם הורדת PDF, שפה ניתנת להחלפה, וגישה לכל הדוחות הקודמים.",
    languageLabel: "שפה",
    regenerate: "צור דוח חדש (שבוע קודם)",
    regenerating: "מייצר...",
    regenerateAI: "חידוש סיכום AI",
    downloadPDF: "הורדה כ-PDF",
    aiSummary: "סיכום AI",
    aiUnavailable: "סיכום AI עדיין לא נוצר עבור השבוע הזה.",
    aiGenerateNow: "צור עכשיו עם AI",
    quietWeek: "שבוע שקט — לא נרשמו לידים, פעילויות או עסקאות בטווח התאריכים הזה.",
    keyNumbers: "מספרי מפתח",
    activityBreakdown: "פירוט פעילות",
    byAgent: "פירוט לפי נציג",
    byLeadType: "לפי סוג ליד",
    topNewLeads: "לידים חדשים בולטים",
    topWins: "סגירות בולטות",
    tasksCompleted: "משימות שהושלמו השבוע",
    tasksInProgress: "משימות בטיפול פעיל",
    bySource: "לפי מקור",
    historyTitle: "היסטוריית דוחות",
    historyHint: "כל הדוחות נשמרים במערכת. לחץ על שבוע כדי לעבור אליו.",
    noHistory: "אין דוחות נוספים בהיסטוריה.",
    showing: "מציג",
    generated: "נוצר",
    open: "פתח",
    newLeads: "לידים חדשים",
    activities: "פעילויות",
    dealsWon: "סגירות",
    dealsLost: "אבדו",
    calls: "שיחות",
    meetings: "פגישות",
    emails: "אימיילים",
    messages: "הודעות",
    stageChanges: "שינויי שלב",
    tasks: "משימות",
    completedCreatedHint: "הושלמו / נפתחו",
    noAgentActivity: "אין פעילות נציגים",
    noNewLeads: "אין לידים חדשים השבוע",
    noLeadsWithAmount: "אין לידים חדשים עם סכום פוטנציאלי",
    noWinsThisWeek: "אין עסקאות שנסגרו השבוע",
    noTasksCompleted: "לא הושלמו משימות",
    noTasksInProgress: "אין משימות פעילות",
    headline: "כותרת",
    executiveSummary: "סיכום מנהלים",
    leadAcquisition: "הזנת לידים",
    pipelineProgress: "התקדמות הצינור",
    tasksWork: "משימות וביצוע",
    highlights: "נקודות בולטות",
    concerns: "לתשומת לב",
    recommendations: "המלצות",
    aiGeneratedNote: "סיכום זה הופק אוטומטית על-ידי AI.",
  },
  en: {
    pageHint: "AI-powered weekly summary with PDF download, language toggle, and full report history.",
    languageLabel: "Language",
    regenerate: "Generate new (last week)",
    regenerating: "Generating...",
    regenerateAI: "Regenerate AI",
    downloadPDF: "Download PDF",
    aiSummary: "AI Summary",
    aiUnavailable: "AI summary has not been generated for this week yet.",
    aiGenerateNow: "Generate with AI",
    quietWeek: "Quiet week — no leads, activities, or deals recorded in this range.",
    keyNumbers: "Key Numbers",
    activityBreakdown: "Activity Breakdown",
    byAgent: "By Agent",
    byLeadType: "By Lead Type",
    topNewLeads: "Top New Leads",
    topWins: "Top Wins",
    tasksCompleted: "Tasks Completed This Week",
    tasksInProgress: "Tasks Worked On (In Progress)",
    bySource: "By Source",
    historyTitle: "Report History",
    historyHint: "All weekly reports are saved. Click a week to view it.",
    noHistory: "No additional reports in history.",
    showing: "Viewing",
    generated: "Generated",
    open: "Open",
    newLeads: "New Leads",
    activities: "Activities",
    dealsWon: "Deals Won",
    dealsLost: "Deals Lost",
    calls: "Calls",
    meetings: "Meetings",
    emails: "Emails",
    messages: "Messages",
    stageChanges: "Stage Changes",
    tasks: "Tasks",
    completedCreatedHint: "completed / created",
    noAgentActivity: "No agent activity",
    noNewLeads: "No new leads this week",
    noLeadsWithAmount: "No new leads with potential amounts",
    noWinsThisWeek: "No deals won this week",
    noTasksCompleted: "No tasks completed",
    noTasksInProgress: "No tasks in progress",
    headline: "Headline",
    executiveSummary: "Executive Summary",
    leadAcquisition: "Lead Acquisition",
    pipelineProgress: "Pipeline Progress",
    tasksWork: "Tasks & Work",
    highlights: "Highlights",
    concerns: "Areas of Concern",
    recommendations: "Recommendations",
    aiGeneratedNote: "This summary was auto-generated by AI.",
  },
};

export default function WeeklySummaryView({ initialSummaries, isAdmin }: Props) {
  const [summaries, setSummaries] = useState<Summary[]>(initialSummaries);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSummaries[0]?.id ?? null
  );
  const [generating, setGenerating] = useState(false);
  const [regeneratingAI, setRegeneratingAI] = useState(false);
  const [lang, setLang] = useState<NarrativeLang>("he");

  const selected = summaries.find((s) => s.id === selectedId) ?? summaries[0];
  const t = UI_STRINGS[lang];
  const dir = lang === "he" ? "rtl" : "ltr";

  const narrative: WeeklyNarrative | null = useMemo(
    () => (selected ? parseNarrative(selected.narrative) : null),
    [selected]
  );
  const narrativeContent: NarrativeContent | null = narrative ? narrative[lang] : null;

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/weekly-summaries", { method: "POST" });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error ?? "Failed to generate");
        return;
      }
      toast.success(lang === "he" ? "נוצר סיכום שבועי" : "Weekly summary generated");
      const list = await fetch("/api/weekly-summaries").then((r) => r.json());
      setSummaries(list.data ?? []);
      setSelectedId(result.summary?.id ?? null);
    } catch {
      toast.error("Network error");
    } finally {
      setGenerating(false);
    }
  }

  async function handleRegenerateAI() {
    if (!selected) return;
    setRegeneratingAI(true);
    try {
      const res = await fetch(`/api/weekly-summaries/${selected.id}/narrative`, {
        method: "POST",
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error ?? "Failed to regenerate");
        return;
      }
      toast.success(lang === "he" ? "סיכום AI עודכן" : "AI summary updated");
      // Refresh selected summary's narrative locally
      setSummaries((prev) =>
        prev.map((s) =>
          s.id === selected.id ? { ...s, narrative: JSON.stringify(result.narrative) } : s
        )
      );
    } catch {
      toast.error("Network error");
    } finally {
      setRegeneratingAI(false);
    }
  }

  if (!selected) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <Sparkles className="w-10 h-10 text-indigo-300 mx-auto mb-3" />
        <p className="text-base font-bold text-gray-700 mb-1">
          {lang === "he" ? "אין עדיין סיכומים שבועיים" : "No weekly summaries yet"}
        </p>
        <p className="text-sm text-gray-400 mb-5">
          {lang === "he"
            ? "הסיכום הראשון ייווצר אוטומטית ביום ראשון בבוקר."
            : "The first one will appear automatically on Sunday morning."}
        </p>
        {isAdmin && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-xl transition disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? t.regenerating : t.regenerate}
          </button>
        )}
      </div>
    );
  }

  const { totals, byOwner, byLeadType, topNewLeads, topWins, bySource, tasksCompletedList, tasksInProgressList } = selected.data;
  const hasNoData =
    totals.newLeads === 0 &&
    totals.activities === 0 &&
    totals.stageChanges === 0 &&
    totals.wonDeals === 0;

  const pdfHref = `/print/weekly/${selected.id}?lang=${lang}`;

  return (
    <div className="space-y-6" dir={dir}>
      {/* Hint banner */}
      <div className="text-xs text-gray-500 flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
        <span>{t.pageHint}</span>
      </div>

      {/* Top bar: title + actions */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-gray-900">
            {fmtDate(selected.weekStart, lang)} – {fmtDate(selected.weekEnd, lang)}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {t.generated} {new Date(selected.generatedAt).toLocaleString(lang === "he" ? "he-IL" : undefined)}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Language toggle */}
          <div className="inline-flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setLang("he")}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                lang === "he" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500"
              }`}
            >
              עברית
            </button>
            <button
              onClick={() => setLang("en")}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                lang === "en" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500"
              }`}
            >
              English
            </button>
          </div>

          {/* PDF download */}
          <Link
            href={pdfHref}
            target="_blank"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-bold text-white rounded-xl transition"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 2px 6px rgba(99,102,241,0.3)" }}
          >
            <Download className="w-4 h-4" />
            {t.downloadPDF}
          </Link>

          {/* Regenerate AI */}
          {isAdmin && (
            <button
              onClick={handleRegenerateAI}
              disabled={regeneratingAI}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-bold text-indigo-700 bg-white border-2 border-indigo-100 rounded-xl transition hover:bg-indigo-50 disabled:opacity-60"
            >
              {regeneratingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {regeneratingAI ? t.regenerating : t.regenerateAI}
            </button>
          )}

          {/* Generate fresh */}
          {isAdmin && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-bold text-gray-700 bg-white border-2 border-gray-100 rounded-xl transition hover:bg-gray-50 disabled:opacity-60"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {generating ? t.regenerating : t.regenerate}
            </button>
          )}
        </div>
      </div>

      {hasNoData && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          {t.quietWeek}
        </div>
      )}

      {/* AI narrative section */}
      <AINarrativePanel
        narrative={narrativeContent}
        lang={lang}
        t={t}
        isAdmin={isAdmin}
        onRegenerate={handleRegenerateAI}
        regenerating={regeneratingAI}
      />

      {/* Key numbers */}
      <SectionHeader title={t.keyNumbers} icon={<FileText className="w-4 h-4" />} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label={t.newLeads} value={totals.newLeads} icon={Users} color="indigo" />
        <StatTile label={t.activities} value={totals.activities} icon={TrendingUp} color="cyan" />
        <StatTile
          label={t.dealsWon}
          value={totals.wonDeals}
          hint={fmtCurrency(totals.wonAmount, lang)}
          icon={Trophy}
          color="green"
        />
        <StatTile label={t.dealsLost} value={totals.lostDeals} icon={ArrowRight} color="rose" />
      </div>

      {/* Activity breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <h3 className="text-sm font-black uppercase tracking-wide text-gray-400 mb-4">{t.activityBreakdown}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatTile label={t.calls} value={totals.callsCount} icon={Phone} color="indigo" />
          <StatTile label={t.meetings} value={totals.meetingsCount} icon={Calendar} color="purple" />
          <StatTile label={t.emails} value={totals.emailsCount} icon={Mail} color="cyan" />
          <StatTile label={t.messages} value={totals.messagesCount} icon={MessageSquare} color="amber" />
          <StatTile label={t.stageChanges} value={totals.stageChanges} icon={ArrowRight} color="indigo" />
          <StatTile
            label={t.tasks}
            value={`${totals.tasksCompleted}/${totals.tasksCreated}`}
            hint={t.completedCreatedHint}
            icon={CheckSquare}
            color="green"
          />
        </div>
      </div>

      {/* Two-column: by owner + by type */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <h3 className="text-sm font-black uppercase tracking-wide text-gray-400 mb-4">{t.byAgent}</h3>
          {byOwner.length === 0 ? (
            <p className="text-sm text-gray-400 italic">{t.noAgentActivity}</p>
          ) : (
            <div className="space-y-2">
              {byOwner.slice(0, 8).map((o) => (
                <div key={o.ownerId ?? "none"} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                  <span className="font-bold text-gray-800 truncate flex-1">{o.ownerName}</span>
                  <div className="flex items-center gap-3 flex-shrink-0 text-xs text-gray-500 font-semibold">
                    <span title={t.newLeads}>{o.newLeads}L</span>
                    <span title={t.activities}>{o.activities}A</span>
                    {o.wonDeals > 0 && (
                      <span className="text-green-700">
                        {o.wonDeals}W · {fmtCurrency(o.wonAmount, lang)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <h3 className="text-sm font-black uppercase tracking-wide text-gray-400 mb-4">{t.byLeadType}</h3>
          {byLeadType.length === 0 ? (
            <p className="text-sm text-gray-400 italic">{t.noNewLeads}</p>
          ) : (
            <div className="space-y-2">
              {byLeadType.map((tt) => (
                <div key={tt.typeId ?? "none"} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                  <span className="font-bold text-gray-800">{tt.typeName}</span>
                  <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                    {tt.newLeads}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top new leads + top wins */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <h3 className="text-sm font-black uppercase tracking-wide text-gray-400 mb-4">{t.topNewLeads}</h3>
          {topNewLeads.length === 0 ? (
            <p className="text-sm text-gray-400 italic">{t.noLeadsWithAmount}</p>
          ) : (
            <div className="space-y-2">
              {topNewLeads.map((l) => (
                <Link
                  key={l.leadId}
                  href={`/leads/${l.leadId}`}
                  className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0 hover:bg-indigo-50/30 -mx-2 px-2 rounded-lg transition"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">{l.displayName}</p>
                    {l.companyName && <p className="text-xs text-gray-400 truncate">{l.companyName}</p>}
                  </div>
                  <span className="text-xs font-black text-indigo-700 ml-2 flex-shrink-0">
                    {l.potentialAmount ? fmtCurrency(l.potentialAmount, lang) : "—"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <h3 className="text-sm font-black uppercase tracking-wide text-gray-400 mb-4">{t.topWins}</h3>
          {topWins.length === 0 ? (
            <p className="text-sm text-gray-400 italic">{t.noWinsThisWeek}</p>
          ) : (
            <div className="space-y-2">
              {topWins.map((l) => (
                <Link
                  key={l.leadId}
                  href={`/leads/${l.leadId}`}
                  className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0 hover:bg-green-50/30 -mx-2 px-2 rounded-lg transition"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">{l.displayName}</p>
                    {l.companyName && <p className="text-xs text-gray-400 truncate">{l.companyName}</p>}
                  </div>
                  <span className="text-xs font-black text-green-700 ml-2 flex-shrink-0">
                    {l.closedAmount ? fmtCurrency(l.closedAmount, lang) : "—"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tasks completed + in progress */}
      {((tasksCompletedList?.length ?? 0) > 0 || (tasksInProgressList?.length ?? 0) > 0) && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black uppercase tracking-wide text-gray-400">{t.tasksCompleted}</h3>
              <span className="text-xs font-black text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                {tasksCompletedList?.length ?? 0}
              </span>
            </div>
            {!tasksCompletedList || tasksCompletedList.length === 0 ? (
              <p className="text-sm text-gray-400 italic">{t.noTasksCompleted}</p>
            ) : (
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {tasksCompletedList.slice(0, 30).map((tt) => (
                  <div key={tt.taskId} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-800 truncate">{tt.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                        <span className="font-mono">{new Date(tt.completedAt).toLocaleDateString(lang === "he" ? "he-IL" : "en-GB", { day: "numeric", month: "short" })}</span>
                        {tt.leadName && tt.leadId && (
                          <>
                            <span>·</span>
                            <Link href={`/leads/${tt.leadId}`} className="text-indigo-600 hover:underline truncate">
                              {tt.leadName}
                            </Link>
                          </>
                        )}
                        {tt.assigneeName && (
                          <>
                            <span>·</span>
                            <span className="truncate">{tt.assigneeName}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {tt.priority !== "NORMAL" && tt.priority !== "LOW" && (
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ml-2 flex-shrink-0 ${
                        tt.priority === "URGENT" ? "bg-red-50 text-red-700" : "bg-orange-50 text-orange-700"
                      }`}>
                        {tt.priority}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black uppercase tracking-wide text-gray-400">{t.tasksInProgress}</h3>
              <span className="text-xs font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                {tasksInProgressList?.length ?? 0}
              </span>
            </div>
            {!tasksInProgressList || tasksInProgressList.length === 0 ? (
              <p className="text-sm text-gray-400 italic">{t.noTasksInProgress}</p>
            ) : (
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {tasksInProgressList.slice(0, 30).map((tt) => {
                  const dueOverdue = tt.dueAt && new Date(tt.dueAt) < new Date();
                  return (
                    <div key={tt.taskId} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-800 truncate">{tt.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                          {tt.dueAt && (
                            <span className={`font-mono ${dueOverdue ? "text-red-600 font-bold" : ""}`}>
                              {dueOverdue ? "⚠ " : ""}
                              {new Date(tt.dueAt).toLocaleDateString(lang === "he" ? "he-IL" : "en-GB", { day: "numeric", month: "short" })}
                            </span>
                          )}
                          {tt.leadName && tt.leadId && (
                            <>
                              {tt.dueAt && <span>·</span>}
                              <Link href={`/leads/${tt.leadId}`} className="text-indigo-600 hover:underline truncate">
                                {tt.leadName}
                              </Link>
                            </>
                          )}
                          {tt.assigneeName && (
                            <>
                              <span>·</span>
                              <span className="truncate">{tt.assigneeName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sources */}
      {bySource.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <h3 className="text-sm font-black uppercase tracking-wide text-gray-400 mb-4">{t.bySource}</h3>
          <div className="flex flex-wrap gap-2">
            {bySource.map((s) => (
              <span key={s.source} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-sm">
                <span className="font-bold text-gray-800">{s.source}</span>
                <span className="text-xs font-black text-indigo-600 bg-white px-2 py-0.5 rounded-full">{s.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Report history */}
      <ReportHistoryPanel
        summaries={summaries}
        selectedId={selected.id}
        onSelect={setSelectedId}
        lang={lang}
        t={t}
      />
    </div>
  );
}

/* ============================ subcomponents ============================ */

function SectionHeader({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-sm font-black uppercase tracking-wide text-gray-500">{title}</h3>
    </div>
  );
}

function AINarrativePanel({
  narrative,
  lang,
  t,
  isAdmin,
  onRegenerate,
  regenerating,
}: {
  narrative: NarrativeContent | null;
  lang: NarrativeLang;
  t: typeof UI_STRINGS["he"];
  isAdmin: boolean;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  if (!narrative) {
    return (
      <div
        className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/30 p-6 text-center"
      >
        <Sparkles className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
        <p className="text-sm font-bold text-gray-700 mb-3">{t.aiUnavailable}</p>
        {isAdmin && (
          <button
            onClick={onRegenerate}
            disabled={regenerating}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-xl transition disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
          >
            {regenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {regenerating ? t.regenerating : t.aiGenerateNow}
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl text-white p-6 md:p-7"
      style={{
        background: "linear-gradient(135deg,#4f46e5 0%,#7c3aed 50%,#9333ea 100%)",
        boxShadow: "0 8px 24px rgba(79,70,229,0.18)",
      }}
    >
      <div className="flex items-center gap-2 mb-3 opacity-90">
        <Sparkles className="w-4 h-4" />
        <span className="text-xs font-black uppercase tracking-widest">{t.aiSummary}</span>
      </div>

      {narrative.headline && (
        <h2 className="text-2xl md:text-3xl font-black leading-tight mb-3">{narrative.headline}</h2>
      )}

      <p className="text-base leading-relaxed opacity-95">{narrative.executiveSummary}</p>

      <div className="grid md:grid-cols-3 gap-3 mt-6">
        <NarrativeCard title={t.leadAcquisition} body={narrative.leadAcquisition} />
        <NarrativeCard title={t.pipelineProgress} body={narrative.pipelineProgress} />
        <NarrativeCard title={t.tasksWork} body={narrative.tasksWork} />
      </div>

      <div className="grid md:grid-cols-3 gap-3 mt-3">
        {narrative.highlights.length > 0 && (
          <BulletCard
            title={t.highlights}
            items={narrative.highlights}
            icon={<Star className="w-3.5 h-3.5" />}
            tint="emerald"
          />
        )}
        {narrative.concerns.length > 0 && (
          <BulletCard
            title={t.concerns}
            items={narrative.concerns}
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
            tint="amber"
          />
        )}
        {narrative.recommendations.length > 0 && (
          <BulletCard
            title={t.recommendations}
            items={narrative.recommendations}
            icon={<Lightbulb className="w-3.5 h-3.5" />}
            tint="indigo"
          />
        )}
      </div>

      <p className="text-[11px] opacity-70 mt-5 text-center">{t.aiGeneratedNote}</p>
    </div>
  );
}

function NarrativeCard({ title, body }: { title: string; body: string }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(2px)" }}
    >
      <div className="text-[11px] font-black uppercase tracking-widest opacity-80 mb-1.5">{title}</div>
      <p className="text-sm leading-relaxed opacity-95">{body}</p>
    </div>
  );
}

function BulletCard({
  title,
  items,
  icon,
  tint,
}: {
  title: string;
  items: string[];
  icon: React.ReactNode;
  tint: "emerald" | "amber" | "indigo";
}) {
  const tintBg: Record<string, string> = {
    emerald: "rgba(16,185,129,0.18)",
    amber: "rgba(245,158,11,0.20)",
    indigo: "rgba(255,255,255,0.14)",
  };
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: tintBg[tint] }}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest opacity-90 mb-2">
        {icon}
        {title}
      </div>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="text-sm leading-snug opacity-95 flex gap-2">
            <span className="opacity-70">•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReportHistoryPanel({
  summaries,
  selectedId,
  onSelect,
  lang,
  t,
}: {
  summaries: Summary[];
  selectedId: string;
  onSelect: (id: string) => void;
  lang: NarrativeLang;
  t: typeof UI_STRINGS["he"];
}) {
  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 p-5"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <History className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-black uppercase tracking-wide text-gray-500">{t.historyTitle}</h3>
        <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
          {summaries.length}
        </span>
      </div>
      <p className="text-xs text-gray-400 mb-4">{t.historyHint}</p>

      {summaries.length === 0 ? (
        <p className="text-sm text-gray-400 italic">{t.noHistory}</p>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
          {summaries.map((s) => {
            const isActive = s.id === selectedId;
            const totals = s.data.totals;
            return (
              <button
                key={s.id}
                onClick={() => onSelect(s.id)}
                className={`text-left p-3 rounded-xl border-2 transition ${
                  isActive
                    ? "bg-indigo-50 border-indigo-300"
                    : "bg-white border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30"
                }`}
              >
                <div className="text-sm font-black text-gray-900">
                  {fmtDate(s.weekStart, lang)}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {fmtDate(s.weekStart, lang)} – {fmtDate(s.weekEnd, lang)}
                </div>
                <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-500 mt-2">
                  <span>{totals.newLeads}L</span>
                  <span>·</span>
                  <span>{totals.activities}A</span>
                  {totals.wonDeals > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-green-700">{totals.wonDeals}W</span>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
