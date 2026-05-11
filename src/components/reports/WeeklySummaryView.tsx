"use client";

import { useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import type { WeeklySummaryData } from "@/lib/weekly-summary";

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

function fmtDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function fmtCurrency(n: number): string {
  if (n === 0) return "$0";
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

export default function WeeklySummaryView({ initialSummaries, isAdmin }: Props) {
  const [summaries, setSummaries] = useState<Summary[]>(initialSummaries);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSummaries[0]?.id ?? null
  );
  const [generating, setGenerating] = useState(false);

  const selected = summaries.find((s) => s.id === selectedId) ?? summaries[0];

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/weekly-summaries", { method: "POST" });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error ?? "Failed to generate");
        return;
      }
      toast.success("Weekly summary generated");
      // Refresh list
      const list = await fetch("/api/weekly-summaries").then((r) => r.json());
      setSummaries(list.data ?? []);
      setSelectedId(result.summary?.id ?? null);
    } catch {
      toast.error("Network error");
    } finally {
      setGenerating(false);
    }
  }

  if (!selected) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <Sparkles className="w-10 h-10 text-indigo-300 mx-auto mb-3" />
        <p className="text-base font-bold text-gray-700 mb-1">No weekly summaries yet</p>
        <p className="text-sm text-gray-400 mb-5">
          The first one will appear automatically on Sunday morning.
        </p>
        {isAdmin && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-xl transition disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {generating ? "Generating…" : "Generate now (last week)"}
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-gray-900">
            {fmtDate(selected.weekStart)} – {fmtDate(selected.weekEnd)}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Generated {new Date(selected.generatedAt).toLocaleString()}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-indigo-700 bg-white border-2 border-indigo-200 rounded-xl transition hover:bg-indigo-50 disabled:opacity-60"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {generating ? "Generating…" : "Regenerate last week"}
          </button>
        )}
      </div>

      {hasNoData && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <strong>Quiet week —</strong> no leads, activities, or deals recorded in this range.
        </div>
      )}

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="New leads" value={totals.newLeads} icon={Users} color="indigo" />
        <StatTile label="Activities" value={totals.activities} icon={TrendingUp} color="cyan" />
        <StatTile
          label="Deals won"
          value={totals.wonDeals}
          hint={fmtCurrency(totals.wonAmount)}
          icon={Trophy}
          color="green"
        />
        <StatTile label="Deals lost" value={totals.lostDeals} icon={ArrowRight} color="rose" />
      </div>

      {/* Activity breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <h3 className="text-sm font-black uppercase tracking-wide text-gray-400 mb-4">Activity breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatTile label="Calls" value={totals.callsCount} icon={Phone} color="indigo" />
          <StatTile label="Meetings" value={totals.meetingsCount} icon={Calendar} color="purple" />
          <StatTile label="Emails" value={totals.emailsCount} icon={Mail} color="cyan" />
          <StatTile label="Messages" value={totals.messagesCount} icon={MessageSquare} color="amber" />
          <StatTile label="Stage changes" value={totals.stageChanges} icon={ArrowRight} color="indigo" />
          <StatTile
            label="Tasks"
            value={`${totals.tasksCompleted}/${totals.tasksCreated}`}
            hint="completed / created"
            icon={CheckSquare}
            color="green"
          />
        </div>
      </div>

      {/* Two-column: by owner + top leads */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <h3 className="text-sm font-black uppercase tracking-wide text-gray-400 mb-4">By agent</h3>
          {byOwner.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No agent activity</p>
          ) : (
            <div className="space-y-2">
              {byOwner.slice(0, 8).map((o) => (
                <div key={o.ownerId ?? "none"} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                  <span className="font-bold text-gray-800 truncate flex-1">{o.ownerName}</span>
                  <div className="flex items-center gap-3 flex-shrink-0 text-xs text-gray-500 font-semibold">
                    <span title="New leads">{o.newLeads}L</span>
                    <span title="Activities">{o.activities}A</span>
                    {o.wonDeals > 0 && (
                      <span className="text-green-700">
                        {o.wonDeals}W · {fmtCurrency(o.wonAmount)}
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
          <h3 className="text-sm font-black uppercase tracking-wide text-gray-400 mb-4">By lead type</h3>
          {byLeadType.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No new leads this week</p>
          ) : (
            <div className="space-y-2">
              {byLeadType.map((t) => (
                <div key={t.typeId ?? "none"} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                  <span className="font-bold text-gray-800">{t.typeName}</span>
                  <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                    {t.newLeads}
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
          <h3 className="text-sm font-black uppercase tracking-wide text-gray-400 mb-4">Top new leads</h3>
          {topNewLeads.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No new leads with potential amounts</p>
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
                    {l.potentialAmount ? fmtCurrency(l.potentialAmount) : "—"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <h3 className="text-sm font-black uppercase tracking-wide text-gray-400 mb-4">Top wins</h3>
          {topWins.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No deals won this week</p>
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
                    {l.closedAmount ? fmtCurrency(l.closedAmount) : "—"}
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
              <h3 className="text-sm font-black uppercase tracking-wide text-gray-400">Tasks completed this week</h3>
              <span className="text-xs font-black text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                {tasksCompletedList?.length ?? 0}
              </span>
            </div>
            {!tasksCompletedList || tasksCompletedList.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No tasks completed</p>
            ) : (
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {tasksCompletedList.slice(0, 30).map((t) => (
                  <div key={t.taskId} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-800 truncate">{t.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                        <span className="font-mono">{new Date(t.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                        {t.leadName && t.leadId && (
                          <>
                            <span>·</span>
                            <Link href={`/leads/${t.leadId}`} className="text-indigo-600 hover:underline truncate">
                              {t.leadName}
                            </Link>
                          </>
                        )}
                        {t.assigneeName && (
                          <>
                            <span>·</span>
                            <span className="truncate">{t.assigneeName}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {t.priority !== "NORMAL" && t.priority !== "LOW" && (
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ml-2 flex-shrink-0 ${
                        t.priority === "URGENT" ? "bg-red-50 text-red-700" : "bg-orange-50 text-orange-700"
                      }`}>
                        {t.priority}
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
              <h3 className="text-sm font-black uppercase tracking-wide text-gray-400">Tasks worked on (In Process)</h3>
              <span className="text-xs font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                {tasksInProgressList?.length ?? 0}
              </span>
            </div>
            {!tasksInProgressList || tasksInProgressList.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No tasks in progress</p>
            ) : (
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {tasksInProgressList.slice(0, 30).map((t) => {
                  const dueOverdue = t.dueAt && new Date(t.dueAt) < new Date();
                  return (
                    <div key={t.taskId} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-800 truncate">{t.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                          {t.dueAt && (
                            <span className={`font-mono ${dueOverdue ? "text-red-600 font-bold" : ""}`}>
                              {dueOverdue ? "⚠ " : ""}
                              {new Date(t.dueAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            </span>
                          )}
                          {t.leadName && t.leadId && (
                            <>
                              {t.dueAt && <span>·</span>}
                              <Link href={`/leads/${t.leadId}`} className="text-indigo-600 hover:underline truncate">
                                {t.leadName}
                              </Link>
                            </>
                          )}
                          {t.assigneeName && (
                            <>
                              <span>·</span>
                              <span className="truncate">{t.assigneeName}</span>
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
          <h3 className="text-sm font-black uppercase tracking-wide text-gray-400 mb-4">By source</h3>
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

      {/* Past weeks list */}
      {summaries.length > 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <h3 className="text-sm font-black uppercase tracking-wide text-gray-400 mb-3">Past weeks</h3>
          <div className="flex flex-wrap gap-2">
            {summaries.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full transition ${
                  s.id === selected.id
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {fmtDate(s.weekStart)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
