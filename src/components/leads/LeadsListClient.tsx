"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Filter,
  Loader2,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  Flame,
  Clock,
  DollarSign,
} from "lucide-react";
import { formatCurrency, formatRelativeTime, leadTypeColor, priorityColor } from "@/lib/utils";
import type { LeadType, Pipeline, Stage } from "@prisma/client";

interface Props {
  leadTypes: LeadType[];
  pipelines: (Pipeline & { stages: Stage[] })[];
  agents: { id: string; name: string }[];
  currentUserId: string;
  isManagerOrAdmin: boolean;
  initialSearch?: string;
}

interface LeadRow {
  id: string;
  displayName: string;
  companyName: string | null;
  email: string | null;
  country: string | null;
  priority: string;
  aiScore: number | null;
  potentialAmount: number | null;
  committedAmount: number | null;
  currency: string;
  status: string;
  nextFollowUpAt: string | null;
  lastActivityAt: string | null;
  source: string | null;
  tags: string[];
  leadType: { id: string; name: string; color: string } | null;
  owner: { id: string; name: string } | null;
  stage: { id: string; name: string; color: string } | null;
}

export default function LeadsListClient({
  leadTypes,
  pipelines,
  agents,
  currentUserId,
  isManagerOrAdmin,
  initialSearch,
}: Props) {
  const router = useRouter();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    search: initialSearch ?? "",
    leadTypeId: "",
    stageId: "",
    ownerId: "",
    priority: "",
    status: "ACTIVE",
    sortBy: "lastActivityAt",
    sortOrder: "desc" as "asc" | "desc",
  });

  const limit = 25;

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    params.set("page", String(page));
    params.set("limit", String(limit));

    try {
      const res = await fetch(`/api/leads?${params}`);
      const data = await res.json();
      setLeads(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  function toggleSort(field: string) {
    setFilters((f) => ({
      ...f,
      sortBy: field,
      sortOrder: f.sortBy === field && f.sortOrder === "desc" ? "asc" : "desc",
    }));
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (filters.sortBy !== field) return null;
    return filters.sortOrder === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />;
  };

  const availableStages = filters.leadTypeId
    ? pipelines
        .filter((p) => p.stages.length > 0)
        .flatMap((p) => p.stages)
    : pipelines.flatMap((p) => p.stages);

  const scoreStyle = (s: number | null) => {
    if (!s) return { bg: "#f3f4f6", color: "#9ca3af" };
    if (s >= 70) return { bg: "#fff7ed", color: "#ea580c" };
    if (s >= 50) return { bg: "#fefce8", color: "#ca8a04" };
    return { bg: "#f0fdf4", color: "#16a34a" };
  };

  const priorityStyle = (p: string) => {
    if (p === "URGENT") return { bg: "#fef2f2", color: "#dc2626" };
    if (p === "HIGH") return { bg: "#fff7ed", color: "#ea580c" };
    if (p === "MEDIUM") return { bg: "#eff6ff", color: "#2563eb" };
    return { bg: "#f9fafb", color: "#6b7280" };
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative" style={{ minWidth: 240 }}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Search leads..."
              className="pl-9 pr-4 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 w-full bg-white transition font-medium placeholder:font-normal"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border-2 transition ${
              showFilters
                ? "border-indigo-300 text-indigo-700 bg-indigo-50"
                : "border-gray-200 text-gray-600 bg-white hover:border-gray-300"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>

          <span className="text-sm font-semibold text-gray-400 bg-white px-3 py-2 rounded-xl border border-gray-200">
            {total} leads
          </span>
        </div>

        <Link
          href="/leads/new"
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-xl transition hover:opacity-90 active:scale-95 whitespace-nowrap"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 4px 14px rgba(99,102,241,0.35)" }}
        >
          <Plus className="w-4 h-4" />
          New Lead
        </Link>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border-2 border-indigo-100 rounded-2xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3"
          style={{ boxShadow: "0 4px 16px rgba(99,102,241,0.08)" }}>
          {[
            {
              value: filters.leadTypeId,
              onChange: (v: string) => setFilters((f) => ({ ...f, leadTypeId: v })),
              options: leadTypes.map((lt) => ({ value: lt.id, label: lt.name })),
              placeholder: "All Types",
            },
            {
              value: filters.stageId,
              onChange: (v: string) => setFilters((f) => ({ ...f, stageId: v })),
              options: availableStages.map((s) => ({ value: s.id, label: s.name })),
              placeholder: "All Stages",
            },
            ...(isManagerOrAdmin ? [{
              value: filters.ownerId,
              onChange: (v: string) => setFilters((f) => ({ ...f, ownerId: v })),
              options: agents.map((a) => ({ value: a.id, label: a.name })),
              placeholder: "All Agents",
            }] : []),
            {
              value: filters.priority,
              onChange: (v: string) => setFilters((f) => ({ ...f, priority: v })),
              options: [
                { value: "URGENT", label: "🔴 Urgent" },
                { value: "HIGH", label: "🟠 High" },
                { value: "MEDIUM", label: "🔵 Medium" },
                { value: "LOW", label: "⚪ Low" },
              ],
              placeholder: "All Priorities",
            },
          ].map((sel, i) => (
            <select key={i} value={sel.value} onChange={(e) => sel.onChange(e.target.value)}
              className="text-sm border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-400 bg-white font-medium transition">
              <option value="">{sel.placeholder}</option>
              {sel.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#fafafa", borderBottom: "1px solid #f0f0f0" }}>
                {[
                  { label: "#", field: null, w: "w-8" },
                  { label: "Name", field: "displayName" },
                  { label: "Type", field: null },
                  { label: "Stage", field: null },
                  { label: "Score", field: "aiScore" },
                  { label: "Potential", field: "potentialAmount" },
                  { label: "Owner", field: null },
                  { label: "Last Activity", field: "lastActivityAt" },
                  { label: "Priority", field: null },
                ].map(({ label, field, w }) => (
                  <th key={label}
                    onClick={() => field && toggleSort(field)}
                    className={`text-left px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-gray-400 ${field ? "cursor-pointer hover:text-gray-700" : ""} ${w ?? ""}`}
                  >
                    <span className="flex items-center gap-1">
                      {label}
                      {field && <SortIcon field={field} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: "#6366f1" }} />
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="flex flex-col items-center py-16 gap-3 text-gray-300">
                      <MoreVertical className="w-10 h-10 opacity-30" />
                      <p className="text-sm font-medium">No leads found</p>
                      <p className="text-xs">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                leads.map((lead, index) => {
                  const isOverdue = lead.nextFollowUpAt && new Date(lead.nextFollowUpAt) < new Date();
                  const ss = scoreStyle(lead.aiScore);
                  const ps = priorityStyle(lead.priority);
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => router.push(`/leads/${lead.id}`)}
                      className="cursor-pointer transition-colors border-b border-gray-50 last:border-0 hover:bg-indigo-50/20 group"
                    >
                      <td className="px-4 py-4 text-xs font-bold text-gray-300">{(page - 1) * limit + index + 1}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                            {lead.displayName[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 group-hover:text-indigo-600 transition">{lead.displayName}</p>
                            {lead.companyName && <p className="text-xs text-gray-400">{lead.companyName}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {lead.leadType && (
                          <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${leadTypeColor(lead.leadType.name)}`}>
                            {lead.leadType.name}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {lead.stage && (
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                            style={{ background: `${lead.stage.color}18`, color: lead.stage.color }}>
                            {lead.stage.name}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {lead.aiScore != null ? (
                          <span className="inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full"
                            style={{ background: ss.bg, color: ss.color }}>
                            {lead.aiScore >= 70 && <Flame className="w-3 h-3" />}
                            {lead.aiScore}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-4 font-black text-gray-800">
                        {formatCurrency(lead.potentialAmount, lead.currency)}
                      </td>
                      <td className="px-4 py-4">
                        {lead.owner ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                              {lead.owner.name[0]?.toUpperCase()}
                            </div>
                            <span className="text-xs font-semibold text-gray-600">{lead.owner.name}</span>
                          </div>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-xs flex items-center gap-1 font-medium ${isOverdue ? "text-red-500" : "text-gray-400"}`}>
                          {isOverdue && <Clock className="w-3 h-3" />}
                          {formatRelativeTime(lead.lastActivityAt)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                          style={{ background: ps.bg, color: ps.color }}>
                          {lead.priority}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-50">
            <span className="text-sm font-medium text-gray-400">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of <span className="font-bold text-gray-600">{total}</span>
            </span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                className="px-4 py-2 text-sm font-semibold border-2 border-gray-200 rounded-xl disabled:opacity-30 hover:border-indigo-300 hover:text-indigo-600 transition">
                ← Prev
              </button>
              <button disabled={page * limit >= total} onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 text-sm font-semibold border-2 border-gray-200 rounded-xl disabled:opacity-30 hover:border-indigo-300 hover:text-indigo-600 transition">
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
