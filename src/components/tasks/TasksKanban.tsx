"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  Clock,
  AlertCircle,
  X,
  Save,
  Trash2,
  CheckCircle2,
  Circle,
  PlayCircle,
  Link2,
  User as UserIcon,
} from "lucide-react";

type TaskStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED";
type TaskType = "CALL" | "EMAIL" | "WHATSAPP" | "MEETING" | "SEND_DOCS" | "COLLECT_PAYMENT" | "UPDATE_KYC" | "OTHER";
type TaskPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

interface Task {
  id: string;
  title: string;
  description: string | null;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
  leadId: string | null;
  assignedTo: string | null;
  lead: { id: string; displayName: string } | null;
  assignee: { id: string; name: string } | null;
}

interface Lead {
  id: string;
  displayName: string;
  companyName: string | null;
}

interface User {
  id: string;
  name: string;
}

interface Props {
  initialTasks: Task[];
  leads: Lead[];
  users: User[];
  currentUserId: string;
  isAdmin: boolean;
}

const taskTypeIcon: Record<string, string> = {
  CALL: "📞",
  EMAIL: "✉️",
  WHATSAPP: "💬",
  MEETING: "🤝",
  SEND_DOCS: "📄",
  COLLECT_PAYMENT: "💰",
  UPDATE_KYC: "🔒",
  OTHER: "✅",
};

const priorityStyle: Record<TaskPriority, { bg: string; fg: string; label: string }> = {
  URGENT: { bg: "#fef2f2", fg: "#b91c1c", label: "דחוף" },
  HIGH: { bg: "#fff7ed", fg: "#c2410c", label: "גבוה" },
  NORMAL: { bg: "#eff6ff", fg: "#1d4ed8", label: "רגיל" },
  LOW: { bg: "#f9fafb", fg: "#6b7280", label: "נמוך" },
};

const columns: { key: TaskStatus; label: string; sub: string; color: string; icon: typeof Circle }[] = [
  { key: "OPEN", label: "Created", sub: "נוצרו", color: "#6366f1", icon: Circle },
  { key: "IN_PROGRESS", label: "In Process", sub: "בעבודה", color: "#f59e0b", icon: PlayCircle },
  { key: "COMPLETED", label: "Done", sub: "הושלמו", color: "#10b981", icon: CheckCircle2 },
];

function fmtDate(s: string | null): string {
  if (!s) return "";
  const d = new Date(s);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  if (target.getTime() === today.getTime()) return "היום";
  if (target.getTime() === tomorrow.getTime()) return "מחר";
  return d.toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}

export default function TasksKanban({ initialTasks, leads, users, currentUserId, isAdmin }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState<{ status: TaskStatus } | null>(null);

  const byStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { OPEN: [], IN_PROGRESS: [], COMPLETED: [] };
    for (const t of tasks) {
      if (t.status === "OPEN" || t.status === "IN_PROGRESS" || t.status === "COMPLETED") {
        map[t.status].push(t);
      }
    }
    return map;
  }, [tasks]);

  async function moveTask(taskId: string, newStatus: TaskStatus) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    const prev = task.status;
    setTasks((ts) => ts.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    setMoving(taskId);

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        setTasks((ts) => ts.map((t) => (t.id === taskId ? { ...t, status: prev } : t)));
        toast.error("ההעברה נכשלה");
      }
    } catch {
      setTasks((ts) => ts.map((t) => (t.id === taskId ? { ...t, status: prev } : t)));
      toast.error("שגיאת רשת");
    } finally {
      setMoving(null);
    }
  }

  function handleDragStart(taskId: string) {
    setDraggedId(taskId);
  }

  function handleDragOver(e: React.DragEvent, col: TaskStatus) {
    e.preventDefault();
    if (dragOverCol !== col) setDragOverCol(col);
  }

  function handleDrop(col: TaskStatus) {
    if (draggedId) moveTask(draggedId, col);
    setDraggedId(null);
    setDragOverCol(null);
  }

  function handleTaskSaved(updated: Task) {
    setTasks((ts) => ts.map((t) => (t.id === updated.id ? updated : t)));
  }

  function handleTaskDeleted(id: string) {
    setTasks((ts) => ts.filter((t) => t.id !== id));
  }

  function handleTaskCreated(created: Task) {
    setTasks((ts) => [created, ...ts]);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-black text-gray-900">משימות</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            גרור בין העמודות כדי לשנות סטטוס · לחץ על משימה כדי לערוך
          </p>
        </div>
        <button
          onClick={() => setCreating({ status: "OPEN" })}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-xl hover:opacity-90 transition"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
        >
          <Plus className="w-4 h-4" /> משימה חדשה
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((col) => {
          const items = byStatus[col.key];
          const isOver = dragOverCol === col.key;
          const Icon = col.icon;
          return (
            <div
              key={col.key}
              onDragOver={(e) => handleDragOver(e, col.key)}
              onDragLeave={() => setDragOverCol((c) => (c === col.key ? null : c))}
              onDrop={() => handleDrop(col.key)}
              className="rounded-2xl flex flex-col"
              style={{
                background: isOver ? `${col.color}10` : "#f8f9fc",
                border: isOver ? `2px dashed ${col.color}` : "1px solid #eef0f5",
                minHeight: 400,
              }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" style={{ color: col.color }} />
                  <span className="font-black text-sm text-gray-900">{col.label}</span>
                  <span className="text-xs font-bold text-gray-500">({items.length})</span>
                </div>
                <button
                  onClick={() => setCreating({ status: col.key })}
                  title="הוסף משימה"
                  className="p-1 rounded-lg hover:bg-white transition text-gray-400 hover:text-gray-700"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="p-2 space-y-2 flex-1 overflow-y-auto" style={{ maxHeight: "calc(100vh - 260px)" }}>
                {items.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-6 italic">אין משימות</p>
                )}
                {items.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    moving={moving === task.id}
                    onDragStart={() => handleDragStart(task.id)}
                    onClick={() => setEditing(task)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {(editing || creating) && (
        <TaskModal
          mode={editing ? "edit" : "create"}
          initial={editing}
          defaultStatus={creating?.status ?? "OPEN"}
          leads={leads}
          users={users}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onClose={() => {
            setEditing(null);
            setCreating(null);
          }}
          onSaved={(t) => {
            if (editing) handleTaskSaved(t);
            else handleTaskCreated(t);
            setEditing(null);
            setCreating(null);
          }}
          onDeleted={(id) => {
            handleTaskDeleted(id);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function TaskCard({
  task,
  moving,
  onDragStart,
  onClick,
}: {
  task: Task;
  moving: boolean;
  onDragStart: () => void;
  onClick: () => void;
}) {
  const now = new Date();
  const due = task.dueAt ? new Date(task.dueAt) : null;
  const overdue = due && due < now && task.status !== "COMPLETED";
  const prio = priorityStyle[task.priority];

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="bg-white rounded-xl p-3 cursor-pointer transition select-none"
      style={{
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        border: "1px solid #eef0f5",
        opacity: moving ? 0.5 : 1,
      }}
    >
      <div className="flex items-start gap-2 mb-2">
        <span className="text-base flex-shrink-0">{taskTypeIcon[task.type] ?? "✅"}</span>
        <p className="text-sm font-bold text-gray-900 flex-1 leading-tight">{task.title}</p>
      </div>

      {task.description && (
        <p className="text-xs text-gray-500 mb-2 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap mt-2">
        {task.lead && (
          <Link
            href={`/leads/${task.lead.id}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full hover:bg-indigo-100"
          >
            <Link2 className="w-3 h-3" />
            {task.lead.displayName}
          </Link>
        )}
        <span
          className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide"
          style={{ background: prio.bg, color: prio.fg }}
        >
          {prio.label}
        </span>
        {due && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
              overdue ? "text-red-600" : "text-gray-500"
            }`}
          >
            {overdue ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {fmtDate(task.dueAt)}
          </span>
        )}
        {task.assignee && (
          <span className="inline-flex items-center gap-0.5 text-xs text-gray-400">
            <UserIcon className="w-3 h-3" />
            {task.assignee.name}
          </span>
        )}
      </div>
    </div>
  );
}

function TaskModal({
  mode,
  initial,
  defaultStatus,
  leads,
  users,
  currentUserId,
  isAdmin,
  onClose,
  onSaved,
  onDeleted,
}: {
  mode: "edit" | "create";
  initial: Task | null;
  defaultStatus: TaskStatus;
  leads: Lead[];
  users: User[];
  currentUserId: string;
  isAdmin: boolean;
  onClose: () => void;
  onSaved: (t: Task) => void;
  onDeleted: (id: string) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [type, setType] = useState<TaskType>(initial?.type ?? "OTHER");
  const [priority, setPriority] = useState<TaskPriority>(initial?.priority ?? "NORMAL");
  const [dueAt, setDueAt] = useState<string>(
    initial?.dueAt ? initial.dueAt.split("T")[0] : ""
  );
  const [leadId, setLeadId] = useState<string>(initial?.leadId ?? "");
  const [leadSearch, setLeadSearch] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>(initial?.assignedTo ?? currentUserId);
  const [status, setStatus] = useState<TaskStatus>(initial?.status ?? defaultStatus);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const filteredLeads = leadSearch
    ? leads.filter(
        (l) =>
          l.displayName.toLowerCase().includes(leadSearch.toLowerCase()) ||
          (l.companyName ?? "").toLowerCase().includes(leadSearch.toLowerCase())
      )
    : leads;

  async function save() {
    if (!title.trim()) {
      toast.error("חובה להזין כותרת");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        type,
        priority,
        dueAt: dueAt || null,
        leadId: leadId || null,
        assignedTo: assignedTo || null,
        status,
      };
      const res = await fetch(mode === "edit" ? `/api/tasks/${initial!.id}` : "/api/tasks", {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        toast.error(result.error ?? "שמירה נכשלה");
        return;
      }
      onSaved(result.data);
      toast.success(mode === "edit" ? "המשימה עודכנה" : "המשימה נוצרה");
    } catch {
      toast.error("שגיאת רשת");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!initial) return;
    if (!window.confirm("למחוק את המשימה?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${initial.id}`, { method: "DELETE" });
      if (res.ok) {
        onDeleted(initial.id);
        toast.success("נמחקה");
      } else {
        toast.error("המחיקה נכשלה");
      }
    } catch {
      toast.error("שגיאת רשת");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="text-lg font-black text-gray-900">
            {mode === "edit" ? "עריכת משימה" : "משימה חדשה"}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <Field label="כותרת *">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="לדוגמה: להתקשר לישראל ישראלי"
              className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400"
            />
          </Field>

          <Field label="תיאור">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="פרטים נוספים..."
              className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 resize-y"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="סוג">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TaskType)}
                className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-indigo-400"
              >
                <option value="OTHER">אחר</option>
                <option value="CALL">שיחת טלפון</option>
                <option value="EMAIL">אימייל</option>
                <option value="WHATSAPP">ווטסאפ</option>
                <option value="MEETING">פגישה</option>
                <option value="SEND_DOCS">שליחת מסמכים</option>
                <option value="COLLECT_PAYMENT">גביית תשלום</option>
                <option value="UPDATE_KYC">עדכון KYC</option>
              </select>
            </Field>
            <Field label="עדיפות">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-indigo-400"
              >
                <option value="LOW">נמוכה</option>
                <option value="NORMAL">רגילה</option>
                <option value="HIGH">גבוהה</option>
                <option value="URGENT">דחופה</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="תאריך יעד">
              <input
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400"
              />
            </Field>
            <Field label="סטטוס">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-indigo-400"
              >
                <option value="OPEN">Created</option>
                <option value="IN_PROGRESS">In Process</option>
                <option value="COMPLETED">Done</option>
              </select>
            </Field>
          </div>

          <Field label="קישור לליד">
            <input
              type="text"
              value={leadSearch}
              onChange={(e) => setLeadSearch(e.target.value)}
              placeholder={
                leadId
                  ? `קשור ל: ${leads.find((l) => l.id === leadId)?.displayName ?? ""}`
                  : "חיפוש ליד..."
              }
              className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 mb-2"
            />
            <div className="max-h-40 overflow-y-auto border-2 border-gray-100 rounded-xl bg-gray-50">
              <button
                type="button"
                onClick={() => setLeadId("")}
                className={`w-full text-right px-3 py-2 text-xs hover:bg-white transition ${
                  !leadId ? "bg-white font-bold text-indigo-700" : "text-gray-500"
                }`}
              >
                — ללא ליד —
              </button>
              {filteredLeads.slice(0, 30).map((l) => (
                <button
                  type="button"
                  key={l.id}
                  onClick={() => setLeadId(l.id)}
                  className={`w-full text-right px-3 py-2 text-xs hover:bg-white transition border-t border-gray-100 ${
                    leadId === l.id ? "bg-white font-bold text-indigo-700" : "text-gray-700"
                  }`}
                >
                  {l.displayName}
                  {l.companyName && <span className="text-gray-400 mr-1">· {l.companyName}</span>}
                </button>
              ))}
            </div>
          </Field>

          {isAdmin && (
            <Field label="שייך ל (אדמין)">
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:border-indigo-400"
              >
                <option value="">— ללא —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </Field>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50 sticky bottom-0">
          {mode === "edit" ? (
            <button
              onClick={remove}
              disabled={deleting || saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-600 border-2 border-red-200 rounded-xl hover:bg-red-50 transition disabled:opacity-60"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              מחק
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={saving || deleting}
              className="px-4 py-2 text-sm font-bold text-gray-700 border-2 border-gray-200 rounded-xl hover:bg-white transition disabled:opacity-60"
            >
              ביטול
            </button>
            <button
              onClick={save}
              disabled={saving || deleting || !title.trim()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-xl hover:opacity-90 disabled:opacity-60 transition"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              שמור
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wide text-gray-400 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
