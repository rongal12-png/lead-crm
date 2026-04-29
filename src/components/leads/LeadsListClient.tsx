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

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Search leads..."
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition ${showFilters ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>

          <span className="text-sm text-gray-500">{total} leads</span>
        </div>

        <Link
          href="/leads/new"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
        >
          <Plus className="w-4 h-4" />
          New Lead
        </Link>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <select
            value={filters.leadTypeId}
            onChange={(e) => setFilters((f) => ({ ...f, leadTypeId: e.target.value }))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Types</option>
            {leadTypes.map((lt) => (
              <option key={lt.id} value={lt.id}>{lt.name}</option>
            ))}
          </select>

          <select
            value={filters.stageId}
            onChange={(e) => setFilters((f) => ({ ...f, stageId: e.target.value }))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Stages</option>
            {availableStages.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {isManagerOrAdmin && (
            <select
              value={filters.ownerId}
              onChange={(e) => setFilters((f) => ({ ...f, ownerId: e.target.value }))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Agents</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          )}

          <select
            value={filters.priority}
            onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600 w-8">#</th>
                <th
                  className="text-left px-4 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-900"
                  onClick={() => toggleSort("displayName")}
                >
                  <span className="flex items-center gap-1">Name <SortIcon field="displayName" /></span>
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Stage</th>
                <th
                  className="text-left px-4 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-900"
                  onClick={() => toggleSort("aiScore")}
                >
                  <span className="flex items-center gap-1">Score <SortIcon field="aiScore" /></span>
                </th>
                <th
                  className="text-left px-4 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-900"
                  onClick={() => toggleSort("potentialAmount")}
                >
                  <span className="flex items-center gap-1">Potential <SortIcon field="potentialAmount" /></span>
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Owner</th>
                <th
                  className="text-left px-4 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-900"
                  onClick={() => toggleSort("lastActivityAt")}
                >
                  <span className="flex items-center gap-1">Last Activity <SortIcon field="lastActivityAt" /></span>
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Priority</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mx-auto" />
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400">
                    No leads found
                  </td>
                </tr>
              ) : (
                leads.map((lead, index) => {
                  const isOverdue = lead.nextFollowUpAt && new Date(lead.nextFollowUpAt) < new Date();
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => router.push(`/leads/${lead.id}`)}
                      className="border-b border-gray-50 hover:bg-indigo-50/30 cursor-pointer transition"
                    >
                      <td className="px-4 py-3 text-gray-400 text-xs">{(page - 1) * limit + index + 1}</td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{lead.displayName}</p>
                          {lead.companyName && <p className="text-xs text-gray-400">{lead.companyName}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {lead.leadType && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${leadTypeColor(lead.leadType.name)}`}>
                            {lead.leadType.name}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {lead.stage && (
                          <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                            {lead.stage.name}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {lead.aiScore != null && (
                          <div className="flex items-center gap-1">
                            {lead.aiScore >= 70 && <Flame className="w-3 h-3 text-orange-500" />}
                            <span className={`font-semibold ${lead.aiScore >= 70 ? "text-orange-600" : lead.aiScore >= 50 ? "text-yellow-600" : "text-gray-500"}`}>
                              {lead.aiScore}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-700">
                        {formatCurrency(lead.potentialAmount, lead.currency)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {lead.owner?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs flex items-center gap-1 ${isOverdue ? "text-red-500" : "text-gray-400"}`}>
                          {isOverdue && <Clock className="w-3 h-3" />}
                          {formatRelativeTime(lead.lastActivityAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor(lead.priority)}`}>
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                disabled={page * limit >= total}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
