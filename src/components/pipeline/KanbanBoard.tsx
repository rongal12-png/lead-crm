"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatRelativeTime, leadTypeColor } from "@/lib/utils";
import { Flame, CheckSquare, Clock, DollarSign, AlertCircle } from "lucide-react";
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

interface Props {
  pipelines: Pipeline[];
  selectedPipeline: Pipeline | null;
  leads: Lead[];
}

export default function KanbanBoard({ pipelines, selectedPipeline, leads: initialLeads }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState(initialLeads);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  useEffect(() => { setLeads(initialLeads); }, [initialLeads]);

  function handlePipelineChange(pipelineId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pipelineId", pipelineId);
    router.push(`/pipeline?${params}`);
  }

  function onDragStart(leadId: string) {
    setDraggedLeadId(leadId);
  }

  function onDragOver(e: React.DragEvent, stageId: string) {
    e.preventDefault();
    setDragOverStageId(stageId);
  }

  async function onDrop(stageId: string) {
    if (!draggedLeadId || !draggedLeadId) return;

    const lead = leads.find((l) => l.id === draggedLeadId);
    if (!lead || lead.stageId === stageId) {
      setDraggedLeadId(null);
      setDragOverStageId(null);
      return;
    }

    // Optimistic update
    setLeads((ls) => ls.map((l) => l.id === draggedLeadId ? { ...l, stageId } : l));

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
        toast.success(`Moved to ${stage?.name}`);
      }
    } catch {
      setLeads(initialLeads);
      toast.error("Network error");
    }

    setDraggedLeadId(null);
    setDragOverStageId(null);
  }

  if (!selectedPipeline) {
    return <div className="text-center py-12 text-gray-400">No pipelines configured</div>;
  }

  const stages = selectedPipeline.stages.filter((s) => !s.isLost);
  const leadsPerStage = (stageId: string) => leads.filter((l) => l.stageId === stageId);
  const valuePerStage = (stageId: string) =>
    leads.filter((l) => l.stageId === stageId).reduce((sum, l) => sum + (l.potentialAmount ?? 0), 0);

  return (
    <div className="flex flex-col h-full">
      {/* Pipeline selector */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex bg-white border border-gray-200 rounded-lg p-1 gap-1">
          {pipelines.map((p) => (
            <button
              key={p.id}
              onClick={() => handlePipelineChange(p.id)}
              className={`px-3 py-1.5 text-sm rounded-md transition ${p.id === selectedPipeline.id ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
            >
              {p.name}
            </button>
          ))}
        </div>
        <span className="text-sm text-gray-500">{leads.length} leads</span>
        <span className="text-sm text-gray-500">•</span>
        <span className="text-sm font-semibold text-gray-700">
          {formatCurrency(leads.reduce((s, l) => s + (l.potentialAmount ?? 0), 0))} total
        </span>
      </div>

      {/* Kanban columns */}
      <div className="flex gap-3 overflow-x-auto pb-4 flex-1">
        {stages.map((stage) => {
          const stageLeads = leadsPerStage(stage.id);
          const stageValue = valuePerStage(stage.id);
          const isDragOver = dragOverStageId === stage.id;

          return (
            <div
              key={stage.id}
              className="flex-shrink-0 w-64"
              onDragOver={(e) => onDragOver(e, stage.id)}
              onDrop={() => onDrop(stage.id)}
            >
              {/* Column header */}
              <div
                className="flex items-center gap-2 mb-2 px-2 py-2 rounded-lg"
                style={{ backgroundColor: `${stage.color}15` }}
              >
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
                <span className="text-sm font-semibold text-gray-900 flex-1 truncate">{stage.name}</span>
                <span className="text-xs text-gray-500 bg-white px-1.5 py-0.5 rounded-full">
                  {stageLeads.length}
                </span>
              </div>

              {stageValue > 0 && (
                <div className="text-xs text-gray-400 text-center mb-2">
                  {formatCurrency(stageValue)}
                </div>
              )}

              {/* Cards */}
              <div
                className={`space-y-2 min-h-20 rounded-xl p-1 transition ${isDragOver ? "bg-indigo-50 ring-2 ring-indigo-200" : ""}`}
              >
                {stageLeads.map((lead) => {
                  const isOverdue = lead.nextFollowUpAt && new Date(lead.nextFollowUpAt) < new Date();
                  const daysSinceActivity = lead.lastActivityAt
                    ? Math.floor((Date.now() - new Date(lead.lastActivityAt).getTime()) / (24 * 60 * 60 * 1000))
                    : 999;
                  const isStuck = daysSinceActivity > 5;

                  return (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={() => onDragStart(lead.id)}
                      className={`bg-white rounded-xl border border-gray-200 p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition group ${draggedLeadId === lead.id ? "opacity-40" : ""}`}
                    >
                      <Link href={`/leads/${lead.id}`} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between gap-1 mb-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-indigo-600">
                              {lead.displayName}
                            </p>
                            {lead.companyName && (
                              <p className="text-xs text-gray-400 truncate">{lead.companyName}</p>
                            )}
                          </div>
                          {lead.aiScore != null && lead.aiScore >= 70 && (
                            <Flame className="w-4 h-4 text-orange-500 flex-shrink-0" />
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {lead.leadType && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${leadTypeColor(lead.leadType.name)}`}>
                              {lead.leadType.name}
                            </span>
                          )}
                          {lead.potentialAmount != null && (
                            <span className="text-xs font-semibold text-gray-700">
                              {formatCurrency(lead.potentialAmount, lead.currency)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            {lead.tasks.length > 0 && (
                              <span className="flex items-center gap-0.5">
                                <CheckSquare className="w-3 h-3" /> {lead.tasks.length}
                              </span>
                            )}
                            {isOverdue && (
                              <span className="text-red-500 flex items-center gap-0.5">
                                <AlertCircle className="w-3 h-3" /> Overdue
                              </span>
                            )}
                            {isStuck && !isOverdue && (
                              <span className="text-yellow-500 flex items-center gap-0.5">
                                <Clock className="w-3 h-3" /> {daysSinceActivity}d
                              </span>
                            )}
                          </div>
                          {lead.owner && (
                            <div className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center text-xs text-indigo-700 font-bold">
                              {lead.owner.name[0]}
                            </div>
                          )}
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
