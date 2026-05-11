"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Phone,
  Mail,
  Globe,
  Edit2,
  Save,
  X,
  Plus,
  CheckSquare,
  Loader2,
  Sparkles,
  ChevronRight,
  Flame,
  Clock,
  DollarSign,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { formatCurrency, formatDate, formatRelativeTime, priorityColor, leadTypeColor } from "@/lib/utils";
import Link from "next/link";

interface Activity {
  id: string;
  type: string;
  title: string | null;
  content: string | null;
  occurredAt: string;
  user: { id: string; name: string; image: string | null } | null;
}

interface Task {
  id: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  dueAt: string | null;
  assignee: { id: string; name: string } | null;
}

interface AIInsight {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  recommendedAction: string | null;
}

interface Lead {
  id: string;
  displayName: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  source: string | null;
  priority: string;
  status: string;
  aiScore: number | null;
  potentialAmount: number | null;
  committedAmount: number | null;
  closedAmount: number | null;
  currency: string;
  probability: number;
  nextFollowUpAt: string | null;
  lastActivityAt: string | null;
  aiSummary: string | null;
  tags: string[];
  leadType: { id: string; name: string; color: string } | null;
  owner: { id: string; name: string } | null;
  stage: { id: string; name: string; color: string; isWon: boolean; isLost: boolean } | null;
  pipeline: { id: string; name: string; stages: { id: string; name: string; order: number; color: string }[] } | null;
  activities: Activity[];
  tasks: Task[];
  aiInsights: AIInsight[];
}

interface Props {
  lead: Lead;
  agents: { id: string; name: string }[];
  currentUserId: string;
  isAdmin: boolean;
}

const activityTypeIcon: Record<string, string> = {
  NOTE: "📝",
  CALL: "📞",
  MEETING: "🤝",
  EMAIL: "✉️",
  WHATSAPP: "💬",
  TELEGRAM: "📱",
  STAGE_CHANGE: "🔄",
  TASK_CREATED: "✅",
  TASK_COMPLETED: "🎯",
  AI_SUMMARY: "🤖",
  AI_COMMAND: "🎤",
  LEAD_CREATED: "⭐",
  FILE_SENT: "📄",
};

export default function LeadDetailClient({ lead, agents, currentUserId, isAdmin }: Props) {
  const router = useRouter();
  const [currentLead, setCurrentLead] = useState(lead);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({
    displayName: lead.displayName,
    companyName: lead.companyName ?? "",
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    country: lead.country ?? "",
    source: lead.source ?? "",
    potentialAmount: lead.potentialAmount ?? "",
    committedAmount: lead.committedAmount ?? "",
    priority: lead.priority,
    nextFollowUpAt: lead.nextFollowUpAt ? lead.nextFollowUpAt.split("T")[0] : "",
  });
  const [saving, setSaving] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState("NOTE");
  const [addingTask, setAddingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function archiveLead() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/leads/${currentLead.id}`, { method: "DELETE" });
      const result = await res.json();
      if (res.ok && result.success) {
        toast.success("הליד הועבר לארכיון. ניתן לשחזר ממסך Trash.");
        router.push("/leads");
      } else {
        toast.error(result.error ?? "מחיקה נכשלה");
      }
    } catch {
      toast.error("שגיאת רשת");
    } finally {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${currentLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editData,
          potentialAmount: editData.potentialAmount ? Number(editData.potentialAmount) : null,
          committedAmount: editData.committedAmount ? Number(editData.committedAmount) : null,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setCurrentLead((l) => ({ ...l, ...editData }));
        setEditMode(false);
        toast.success("Lead updated");
      }
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function moveStage(stageId: string) {
    const res = await fetch(`/api/leads/${currentLead.id}/move-stage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId }),
    });
    const result = await res.json();
    if (result.success) {
      const newStage = currentLead.pipeline?.stages.find((s) => s.id === stageId);
      if (newStage) setCurrentLead((l) => ({ ...l, stage: { ...newStage, isWon: false, isLost: false } }));
      toast.success(`Moved to ${result.data.stageName}`);
    }
  }

  async function addNote() {
    if (!noteText.trim()) return;
    const res = await fetch(`/api/leads/${currentLead.id}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: noteType, title: noteType, content: noteText }),
    });
    const result = await res.json();
    if (result.success) {
      setCurrentLead((l) => ({ ...l, activities: [result.data, ...l.activities] }));
      setNoteText("");
      setAddingNote(false);
      toast.success("Note added");
    }
  }

  async function addTask() {
    if (!taskTitle.trim()) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: currentLead.id,
        title: taskTitle,
        dueAt: taskDue || undefined,
      }),
    });
    const result = await res.json();
    if (result.success) {
      setCurrentLead((l) => ({ ...l, tasks: [...l.tasks, result.data] }));
      setTaskTitle("");
      setTaskDue("");
      setAddingTask(false);
      toast.success("Task created");
    }
  }

  async function completeTask(taskId: string) {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ complete: true }),
    });
    if (res.ok) {
      setCurrentLead((l) => ({
        ...l,
        tasks: l.tasks.map((t) => t.id === taskId ? { ...t, status: "COMPLETED" } : t),
      }));
      toast.success("Task completed");
    }
  }

  async function generateSummary() {
    setGeneratingSummary(true);
    try {
      const res = await fetch(`/api/ai/summarize/${currentLead.id}`, { method: "POST" });
      const result = await res.json();
      if (result.success) {
        setCurrentLead((l) => ({ ...l, aiSummary: result.data.summary }));
        toast.success("AI summary generated");
      }
    } catch {
      toast.error("Failed to generate summary");
    } finally {
      setGeneratingSummary(false);
    }
  }

  const openTasks = currentLead.tasks.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS");
  const completedTasks = currentLead.tasks.filter((t) => t.status === "COMPLETED");

  const severityColor = (sev: string) => {
    switch (sev) {
      case "CRITICAL": return "border-red-200 bg-red-50 text-red-700";
      case "HIGH": return "border-orange-200 bg-orange-50 text-orange-700";
      case "MEDIUM": return "border-yellow-200 bg-yellow-50 text-yellow-700";
      default: return "border-blue-200 bg-blue-50 text-blue-700";
    }
  };

  const inp = "w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" /> Back to Leads
        </button>
        <div className="flex gap-2">
          {editMode ? (
            <>
              <button onClick={() => setEditMode(false)} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg">
                <X className="w-4 h-4" /> Cancel
              </button>
              <button onClick={saveEdit} disabled={saving} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditMode(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
                <Edit2 className="w-4 h-4" /> Edit
              </button>
              <button
                onClick={() => setDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                title="העבר לארכיון (ניתן לשחזר)"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </>
          )}
        </div>
      </div>

      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && setDeleteConfirm(false)}
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6" dir="rtl">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900">למחוק את הליד?</h3>
                <p className="text-sm text-gray-600 mt-1">
                  הליד <strong>{currentLead.displayName}</strong> יועבר לארכיון.
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  אפשר לשחזר אותו מאוחר יותר מ־<strong>Trash / Restore</strong> בתפריט הצד.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-60"
              >
                ביטול
              </button>
              <button
                onClick={archiveLead}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-xl hover:opacity-90 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,#ef4444,#dc2626)" }}
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? "מוחק..." : "מחק"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-4">
          {/* Lead Info Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                {editMode ? (
                  <input value={editData.displayName} onChange={(e) => setEditData((d) => ({ ...d, displayName: e.target.value }))} className={`${inp} text-lg font-bold mb-1`} />
                ) : (
                  <h2 className="text-xl font-bold text-gray-900">{currentLead.displayName}</h2>
                )}
                {editMode ? (
                  <input value={editData.companyName} onChange={(e) => setEditData((d) => ({ ...d, companyName: e.target.value }))} placeholder="Company" className={inp} />
                ) : (
                  currentLead.companyName && <p className="text-gray-500 text-sm">{currentLead.companyName}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                {currentLead.leadType && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${leadTypeColor(currentLead.leadType.name)}`}>
                    {currentLead.leadType.name}
                  </span>
                )}
                {currentLead.aiScore != null && (
                  <div className="flex items-center gap-1 text-sm font-bold">
                    {currentLead.aiScore >= 70 && <Flame className="w-4 h-4 text-orange-500" />}
                    <span className={currentLead.aiScore >= 70 ? "text-orange-600" : "text-gray-600"}>
                      {currentLead.aiScore}/100
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-2 text-sm">
              {(currentLead.email || editMode) && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  {editMode ? (
                    <input value={editData.email} onChange={(e) => setEditData((d) => ({ ...d, email: e.target.value }))} placeholder="Email" className={inp} />
                  ) : (
                    <a href={`mailto:${currentLead.email}`} className="hover:text-indigo-600">{currentLead.email}</a>
                  )}
                </div>
              )}
              {(currentLead.phone || editMode) && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  {editMode ? (
                    <input value={editData.phone} onChange={(e) => setEditData((d) => ({ ...d, phone: e.target.value }))} placeholder="Phone" className={inp} />
                  ) : (
                    <a href={`tel:${currentLead.phone}`} className="hover:text-indigo-600">{currentLead.phone}</a>
                  )}
                </div>
              )}
              {(currentLead.country || editMode) && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Globe className="w-4 h-4 flex-shrink-0" />
                  {editMode ? (
                    <input value={editData.country} onChange={(e) => setEditData((d) => ({ ...d, country: e.target.value }))} placeholder="Country" className={inp} />
                  ) : (
                    <span>{currentLead.country}</span>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Owner</span>
                <span className="font-medium">{currentLead.owner?.name ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Source</span>
                {editMode ? (
                  <input value={editData.source} onChange={(e) => setEditData((d) => ({ ...d, source: e.target.value }))} className="text-sm border-b border-gray-200 focus:outline-none focus:border-indigo-500 text-right" />
                ) : (
                  <span className="font-medium">{currentLead.source ?? "—"}</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Priority</span>
                {editMode ? (
                  <select value={editData.priority} onChange={(e) => setEditData((d) => ({ ...d, priority: e.target.value }))} className="text-sm border-b border-gray-200 focus:outline-none">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                ) : (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor(currentLead.priority)}`}>
                    {currentLead.priority}
                  </span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Follow-up</span>
                {editMode ? (
                  <input type="date" value={editData.nextFollowUpAt} onChange={(e) => setEditData((d) => ({ ...d, nextFollowUpAt: e.target.value }))} className="text-sm border-b border-gray-200 focus:outline-none" />
                ) : (
                  <span className={`text-sm font-medium ${currentLead.nextFollowUpAt && new Date(currentLead.nextFollowUpAt) < new Date() ? "text-red-500" : ""}`}>
                    {formatDate(currentLead.nextFollowUpAt)}
                  </span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Last Activity</span>
                <span className="text-sm">{formatRelativeTime(currentLead.lastActivityAt)}</span>
              </div>
            </div>
          </div>

          {/* Financials */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Financials
            </h3>
            <div className="space-y-3">
              {[
                { label: "Potential", field: "potentialAmount" as const, value: currentLead.potentialAmount },
                { label: "Committed", field: "committedAmount" as const, value: currentLead.committedAmount },
                { label: "Closed", value: currentLead.closedAmount, field: null },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">{item.label}</span>
                  {editMode && item.field ? (
                    <input
                      type="number"
                      value={editData[item.field]}
                      onChange={(e) => setEditData((d) => ({ ...d, [item.field!]: e.target.value }))}
                      className="w-32 text-sm border-b border-gray-200 focus:outline-none text-right font-medium"
                    />
                  ) : (
                    <span className="font-semibold text-gray-900">{formatCurrency(item.value, currentLead.currency)}</span>
                  )}
                </div>
              ))}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Probability</span>
                <span className="font-semibold">{currentLead.probability}%</span>
              </div>
            </div>
          </div>

          {/* Stage Progression */}
          {currentLead.pipeline && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Pipeline Stage</h3>
              <div className="space-y-1">
                {currentLead.pipeline.stages.slice(0, 8).map((stage) => {
                  const isCurrent = currentLead.stage?.id === stage.id;
                  return (
                    <button
                      key={stage.id}
                      onClick={() => moveStage(stage.id)}
                      className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${isCurrent ? "bg-indigo-100 text-indigo-700 font-semibold" : "hover:bg-gray-50 text-gray-600"}`}
                    >
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
                      {stage.name}
                      {isCurrent && <ChevronRight className="w-3 h-3 ml-auto" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Insights */}
          {currentLead.aiInsights.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" /> AI Insights
              </h3>
              <div className="space-y-2">
                {currentLead.aiInsights.map((insight) => (
                  <div key={insight.id} className={`p-3 rounded-lg border text-xs ${severityColor(insight.severity)}`}>
                    <p className="font-semibold">{insight.title}</p>
                    <p className="mt-0.5 opacity-80">{insight.message}</p>
                    {insight.recommendedAction && (
                      <p className="mt-1 font-medium">→ {insight.recommendedAction}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* AI Summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" /> AI Summary
              </h3>
              <button
                onClick={generateSummary}
                disabled={generatingSummary}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 disabled:opacity-60"
              >
                {generatingSummary ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {generatingSummary ? "Generating..." : "Regenerate"}
              </button>
            </div>
            {currentLead.aiSummary ? (
              <p className="text-sm text-gray-700 leading-relaxed">{currentLead.aiSummary}</p>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-400 mb-2">No AI summary yet</p>
                <button onClick={generateSummary} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                  Generate summary
                </button>
              </div>
            )}
          </div>

          {/* Tasks */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <CheckSquare className="w-4 h-4" /> Tasks
                {openTasks.length > 0 && (
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{openTasks.length}</span>
                )}
              </h3>
              <button onClick={() => setAddingTask(!addingTask)} className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700">
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            {addingTask && (
              <div className="p-4 border-b border-gray-100 bg-gray-50 space-y-2">
                <input
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Task title..."
                  className={inp}
                  autoFocus
                />
                <div className="flex gap-2">
                  <input type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} className={`${inp} flex-1`} />
                  <button onClick={addTask} disabled={!taskTitle.trim()} className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg disabled:opacity-40">
                    Add
                  </button>
                  <button onClick={() => setAddingTask(false)} className="px-3 py-1.5 border border-gray-200 text-sm rounded-lg">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="divide-y divide-gray-50">
              {openTasks.map((task) => {
                const isOverdue = task.dueAt && new Date(task.dueAt) < new Date();
                return (
                  <div key={task.id} className="flex items-center gap-3 p-3">
                    <button onClick={() => completeTask(task.id)} className="w-5 h-5 rounded border-2 border-gray-300 hover:border-indigo-500 flex-shrink-0 transition" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{task.title}</p>
                      {task.dueAt && (
                        <p className={`text-xs flex items-center gap-1 ${isOverdue ? "text-red-500" : "text-gray-400"}`}>
                          <Clock className="w-3 h-3" />
                          {formatDate(task.dueAt)}
                          {isOverdue && " (overdue)"}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColor(task.priority)}`}>{task.priority}</span>
                  </div>
                );
              })}
              {openTasks.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No open tasks</p>
              )}
            </div>
          </div>

          {/* Timeline + Add Note */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Activity Timeline</h3>
              <button onClick={() => setAddingNote(!addingNote)} className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700">
                <Plus className="w-4 h-4" /> Add Note
              </button>
            </div>

            {addingNote && (
              <div className="p-4 border-b border-gray-100 bg-gray-50 space-y-2">
                <div className="flex gap-2">
                  {["NOTE", "CALL", "MEETING", "EMAIL", "WHATSAPP"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setNoteType(type)}
                      className={`text-xs px-2 py-1 rounded-full border transition ${noteType === type ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 text-gray-600 hover:border-indigo-300"}`}
                    >
                      {activityTypeIcon[type]} {type}
                    </button>
                  ))}
                </div>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add a note..."
                  rows={3}
                  className={inp}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button onClick={addNote} disabled={!noteText.trim()} className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg disabled:opacity-40">
                    Save
                  </button>
                  <button onClick={() => { setAddingNote(false); setNoteText(""); }} className="px-3 py-1.5 border border-gray-200 text-sm rounded-lg">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
              {currentLead.activities.map((activity) => (
                <div key={activity.id} className="flex gap-3 p-3">
                  <div className="text-lg flex-shrink-0 mt-0.5">
                    {activityTypeIcon[activity.type] ?? "📌"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{activity.user?.name ?? "System"}</span>
                      <span className="text-xs text-gray-400">{formatRelativeTime(activity.occurredAt)}</span>
                    </div>
                    {activity.title && (
                      <p className="text-sm text-gray-600">{activity.title}</p>
                    )}
                    {activity.content && (
                      <p className="text-sm text-gray-500 mt-0.5 whitespace-pre-wrap">{activity.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {currentLead.activities.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">No activity yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
