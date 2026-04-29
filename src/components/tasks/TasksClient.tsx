"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CheckSquare, Clock, AlertCircle, Plus, Loader2 } from "lucide-react";
import { formatDate, priorityColor } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  dueAt: string | null;
  lead: { id: string; displayName: string } | null;
  assignee: { id: string; name: string } | null;
}

interface Props {
  initialTasks: Task[];
  currentUserId: string;
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

export default function TasksClient({ initialTasks, currentUserId }: Props) {
  const [tasks, setTasks] = useState(initialTasks);
  const [completing, setCompleting] = useState<string | null>(null);
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDue, setNewTaskDue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<"all" | "overdue" | "today">("all");

  async function completeTask(taskId: string) {
    setCompleting(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complete: true }),
      });
      if (res.ok) {
        setTasks((ts) => ts.filter((t) => t.id !== taskId));
        toast.success("Task completed ✓");
      }
    } catch {
      toast.error("Failed");
    } finally {
      setCompleting(null);
    }
  }

  async function addTask() {
    if (!newTaskTitle.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTaskTitle, dueAt: newTaskDue || undefined }),
      });
      const result = await res.json();
      if (result.success) {
        setTasks((ts) => [result.data, ...ts]);
        setNewTaskTitle("");
        setNewTaskDue("");
        setAddingTask(false);
        toast.success("Task created");
      }
    } catch {
      toast.error("Failed");
    } finally {
      setSubmitting(false);
    }
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  const filteredTasks = tasks.filter((t) => {
    if (filter === "overdue") return t.dueAt && new Date(t.dueAt) < now;
    if (filter === "today") return t.dueAt && new Date(t.dueAt) >= today && new Date(t.dueAt) < tomorrow;
    return true;
  });

  const overdueCount = tasks.filter((t) => t.dueAt && new Date(t.dueAt) < now).length;
  const todayCount = tasks.filter((t) => t.dueAt && new Date(t.dueAt) >= today && new Date(t.dueAt) < tomorrow).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {[
            { key: "all", label: `All (${tasks.length})` },
            { key: "overdue", label: `Overdue (${overdueCount})` },
            { key: "today", label: `Today (${todayCount})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as "all" | "overdue" | "today")}
              className={`px-3 py-1.5 text-sm rounded-lg transition ${filter === key ? "bg-indigo-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setAddingTask(!addingTask)}
          className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      {addingTask && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <input
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Task title..."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={newTaskDue}
              onChange={(e) => setNewTaskDue(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button onClick={addTask} disabled={!newTaskTitle.trim() || submitting} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg disabled:opacity-40 flex items-center gap-1">
              {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
              Add
            </button>
            <button onClick={() => setAddingTask(false)} className="px-3 py-2 border border-gray-200 text-sm rounded-lg">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-50">
          {filteredTasks.length === 0 && (
            <div className="text-center py-12">
              <CheckSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">No tasks here</p>
            </div>
          )}
          {filteredTasks.map((task) => {
            const isOverdue = task.dueAt && new Date(task.dueAt) < now;
            const isToday = task.dueAt && new Date(task.dueAt) >= today && new Date(task.dueAt) < tomorrow;
            return (
              <div key={task.id} className="flex items-center gap-3 p-4 hover:bg-gray-50">
                <button
                  onClick={() => completeTask(task.id)}
                  disabled={completing === task.id}
                  className="w-5 h-5 rounded border-2 border-gray-300 hover:border-indigo-500 flex-shrink-0 transition flex items-center justify-center"
                >
                  {completing === task.id && <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />}
                </button>

                <div className="text-lg flex-shrink-0">{taskTypeIcon[task.type] ?? "✅"}</div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{task.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {task.lead && (
                      <Link href={`/leads/${task.lead.id}`} className="text-xs text-indigo-600 hover:underline">
                        {task.lead.displayName}
                      </Link>
                    )}
                    {task.assignee && (
                      <span className="text-xs text-gray-400">{task.assignee.name}</span>
                    )}
                    {task.dueAt && (
                      <span className={`text-xs flex items-center gap-0.5 ${isOverdue ? "text-red-500 font-medium" : isToday ? "text-orange-500" : "text-gray-400"}`}>
                        {isOverdue ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {formatDate(task.dueAt)}
                        {isOverdue && " — overdue"}
                      </span>
                    )}
                  </div>
                </div>

                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${priorityColor(task.priority)}`}>
                  {task.priority}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
