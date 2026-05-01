"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatRelativeTime, leadTypeColor, getInitials } from "@/lib/utils";
import { Flame, CheckSquare, Clock, AlertCircle, Plus, Filter, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface Stage {
  id: string;
  name: string;
  color: string;
  order: number;
  isWon: boolean;
  isLost: boolean;
  probability: number;
}

interface Pipeline {
  id: string;
  name: string;
  stages: Stage[];
}

interface Lead {
  id: string;
  displayName: string;
  companyName: string | null;
  stageId: string | null;
  aiScore: number | null;
  potentialAmount: number | null;
  currency: string;
  priority: string;
  lastActivityAt: string | null;
  nextFollowUpAt: string | null;
  leadType: { name: string; color: string } | null;
  owner: { id: string; name: string } | null;
  tasks: { id: string }[];
}

const priorityDot: Record<string, string> = {
  URGENT: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-blue-400",
  LOW: "bg-gray-300",
};

const scoreRing = (score: number | null) => {
  if (!score) return "#e5e7eb";
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#f59e0b";
  if (score >= 40) return "#f97316";
  return "#ef4444";
};

export default function KanbanBoard({ pipelines, selectedPipeline, leads: initialLeads }: {
  pipelines: Pipeline[];
  selectedPipeline: Pipeline | null;
  leads: Lead[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState(initialLeads);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);
  const [moving, setMoving] = useState<string | null>(null);

  useEffect(() => { setLeads(initialLeads); }, [initialLeads]);

  function handlePipelineChange(pipelineId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pipelineId", pipelineId);
    router.push(`/pipeline?${params}`);
  }

  async function onDrop(stageId: string) {
    if (!draggedLeadId) return;
    const lead = leads.find((l) => l.id === draggedLeadId);
    if (!lead || lead.stageId === stageId) {
      setDraggedLeadId(null);
      setDragOverStageId(null);
      return;
    }

    setLeads((ls) => ls.map((l) => l.id === draggedLeadId ? { ...l, stageId } : l));
    setMoving(draggedLeadId);

    try {
      const res = await fetch(`/api/leads/${draggedLeadId}/move-stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId }),
      });
      const result = await res.json();
      if (!result.success) {
        setLeads(initialLeads);
        toast.error("Failed to move lead");
      } else {
        const stage = selectedPipeline?.stages.find((s) => s.id === stageId);
        toast.success(`✓ Moved to ${stage?.name}`);
      }
    } catch {
      setLeads(initialLeads);
      toast.error("Network error");
    }

    setDraggedLeadId(null);
    setDragOverStageId(null);
    setMoving(null);
  }

  if (!selectedPipeline) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
        <span className="text-5xl">🗂️</span>
        <p className="font-medium">No pipelines configured</p>
      </div>
    );
  }

  const stages = selectedPipeline.stages.filter((s) => !s.isLost);
  const stageLeads = (id: string) => leads.filter((l) => l.stageId === id);
  const stageValue = (id: string) => leads.filter((l) => l.stageId === id).reduce((s, l) => s + (l.potentialAmount ?? 0), 0);
  const totalValue = leads.reduce((s, l) => s + (l.potentialAmount ?? 0), 0);

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        {/* Pipeline tabs */}
        <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 gap-0.5 shadow-sm">
          {pipelines.map((p) => (
            <button
              key={p.id}
              onClick={() => handlePipelineChange(p.id)}
              className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition ${
                p.id === selectedPipeline.id
                  ? "text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
              style={p.id === selectedPipeline.id ? { background: "linear-gradient(135deg,#6366f1,#8b5cf6)" } : {}}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Stats pills */}
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            {leads.length} leads
          </span>
          {totalValue > 0 && (
            <span className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm">
              <DollarSign className="w-3 h-3 text-emerald-500" />
              {formatCurrency(totalValue)}
            </span>
          )}
        </div>

        <div className="flex-1" />
        <Link
          href="/leads/new"
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white rounded-lg hover:opacity-90 transition shadow-sm"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
        >
          <Plus className="w-3.5 h-3.5" /> Add Lead
        </Link>
      </div>

      {/* Kanban columns */}
      <div className="flex gap-3 overflow-x-auto pb-6 flex-1 -mx-1 px-1">
        {stages.map((stage) => {
          const sl = stageLeads(stage.id);
          const sv = stageValue(stage.id);
          const isDragOver = dragOverStageId === stage.id;

          return (
            <div
              key={stage.id}
              className="flex-shrink-0 w-[272px] flex flex-col"
              onDragOver={(e) => { e.preventDefault(); setDragOverStageId(stage.id); }}
              onDragLeave={() => setDragOverStageId(null)}
              onDrop={() => onDrop(stage.id)}
            >
              {/* Column header */}
              <div className="flex items-center gap-2 mb-3 px-1">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: stage.color }}
                />
                <span className="text-[13px] font-bold text-gray-800 flex-1 truncate">{stage.name}</span>
                <div className="flex items-center gap-1.5">
                  {sv > 0 && (
                    <span className="text-[10px] font-semibold text-gray-400">{formatCurrency(sv)}</span>
                  )}
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: stage.color }}
                  >
                    {sl.length}
                  </span>
                </div>
              </div>

              {/* Drop zone */}
              <div
                className={`flex-1 space-y-2.5 rounded-xl p-2 min-h-24 transition-all duration-150 ${
                  isDragOver ? "kanban-drop-active" : ""
                }`}
              >
                {sl.map((lead) => {
                  const isOverdue = lead.nextFollowUpAt && new Date(lead.nextFollowUpAt) < new Date();
                  const daysSince = lead.lastActivityAt
                    ? Math.floor((Date.now() - new Date(lead.lastActivityAt).getTime()) / 864e5)
                    : 999;
                  const isStuck = daysSince > 5;
                  const score = lead.aiScore;
                  const isDragging = draggedLeadId === lead.id;

                  return (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={() => setDraggedLeadId(lead.id)}
                      onDragEnd={() => { setDraggedLeadId(null); setDragOverStageId(null); }}
                      className={`bg-white rounded-xl border border-gray-100 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group ${
                        isDragging ? "kanban-dragging shadow-lg" : "shadow-sm"
                      } ${moving === lead.id ? "opacity-60" : ""}`}
                    >
                      <div className="p-3.5">
                        {/* Top row */}
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/leads/${lead.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="block text-[13px] font-bold text-gray-900 truncate group-hover:text-indigo-600 transition"
                            >
                              {lead.displayName}
                            </Link>
                            {lead.companyName && (
                              <p className="text-[11px] text-gray-400 truncate mt-0.5">{lead.companyName}</p>
                            )}
                          </div>
                          {/* AI Score ring */}
                          {score != null && (
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
                              style={{
                                background: `conic-gradient(${scoreRing(score)} ${score * 3.6}deg, #f3f4f6 0deg)`,
                              }}
                            >
                              <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] font-bold"
                                style={{ color: scoreRing(score) }}>
                                {score}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Tags */}
                        <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
                          {lead.leadType && (
                            <span className={`status-pill ${leadTypeColor(lead.leadType.name)}`}>
                              {lead.leadType.name}
                            </span>
                          )}
                          {lead.potentialAmount != null && (
                            <span className="status-pill bg-emerald-50 text-emerald-700">
                              {formatCurrency(lead.potentialAmount, lead.currency)}
                            </span>
                          )}
                          {lead.priority && lead.priority !== "MEDIUM" && (
                            <span className={`status-pill ${
                              lead.priority === "URGENT" ? "bg-red-50 text-red-700" :
                              lead.priority === "HIGH" ? "bg-orange-50 text-orange-700" :
                              "bg-gray-50 text-gray-600"
                            }`}>
                              {lead.priority}
                            </span>
                          )}
                        </div>

                        {/* Bottom row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[11px] text-gray-400">
                            {lead.tasks.length > 0 && (
                              <span className="flex items-center gap-0.5">
                                <CheckSquare className="w-3 h-3" /> {lead.tasks.length}
                              </span>
                            )}
                            {isOverdue && (
                              <span className="flex items-center gap-0.5 text-red-500 font-semibold">
                                <AlertCircle className="w-3 h-3" /> Overdue
                              </span>
                            )}
                            {isStuck && !isOverdue && (
                              <span className="flex items-center gap-0.5 text-amber-500">
                                <Clock className="w-3 h-3" /> {daysSince}d idle
                              </span>
                            )}
                            {score != null && score >= 75 && (
                              <Flame className="w-3 h-3 text-orange-500" />
                            )}
                          </div>
                          {lead.owner && (
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
                              title={lead.owner.name}
                            >
                              {lead.owner.name[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Priority bar at bottom */}
                      <div
                        className="h-[3px] rounded-b-xl"
                        style={{
                          backgroundColor: stage.color,
                          opacity: 0.4,
                        }}
                      />
                    </div>
                  );
                })}

                {/* Empty state */}
                {sl.length === 0 && !isDragOver && (
                  <div className="flex flex-col items-center justify-center py-8 gap-1.5 text-gray-300">
                    <span className="text-2xl">○</span>
                    <p className="text-[11px]">Drop here</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
