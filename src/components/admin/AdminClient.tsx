"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Users, Layers, GitBranch, Zap, Plus, Loader2,
  Pencil, Trash2, CheckCircle, XCircle, Shield,
  Eye, UserCheck, UserX, MoreVertical, X, Save,
  Settings, Activity, TrendingUp, ChevronLeft, ChevronRight,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  _count?: { ownedLeads: number; assignedTasks: number };
}
interface LeadType { id: string; name: string; description: string | null; isActive: boolean; color: string; }
interface Stage { id: string; name: string; order: number; probability: number; color: string; isWon: boolean; isLost: boolean; }
interface Pipeline { id: string; name: string; description: string | null; stages: Stage[]; }

const STAGE_PALETTE = ["#6366f1", "#3b82f6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#6b7280"];
interface AutomationRule { id: string; name: string; trigger: string; isActive: boolean; createdAt: string; }
interface Stats { totalLeads: number; activeUsers: number; openTasks: number; }

interface Props {
  users: User[];
  leadTypes: LeadType[];
  pipelines: Pipeline[];
  automationRules: AutomationRule[];
  stats: Stats;
  currentUserId: string;
}

type Tab = "overview" | "users" | "lead-types" | "pipelines" | "automations";

const roleConfig: Record<string, { label: string; color: string; bg: string; icon: typeof Shield }> = {
  ADMIN: { label: "Admin", color: "#dc2626", bg: "#fee2e2", icon: Shield },
  MANAGER: { label: "Manager", color: "#d97706", bg: "#fef3c7", icon: UserCheck },
  AGENT: { label: "Agent", color: "#2563eb", bg: "#dbeafe", icon: Users },
  VIEWER: { label: "Viewer", color: "#6b7280", bg: "#f3f4f6", icon: Eye },
};

const inp = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white";
const btn = "px-4 py-2 text-sm font-semibold rounded-lg transition active:scale-95";

export default function AdminClient({ users: init, leadTypes, pipelines: pipelinesInit, automationRules, stats, currentUserId }: Props) {
  const [tab, setTab] = useState<Tab>("overview");
  const [users, setUsers] = useState(init);
  const [showNewUser, setShowNewUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "AGENT" });
  const [submitting, setSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("");
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [rules, setRules] = useState(automationRules);
  const [pipelines, setPipelines] = useState<Pipeline[]>(pipelinesInit);
  const [showNewPipeline, setShowNewPipeline] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState("");
  const [editingPipeline, setEditingPipeline] = useState<string | null>(null);
  const [pipelineNameDraft, setPipelineNameDraft] = useState("");
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [stageDraft, setStageDraft] = useState<{ name: string; color: string; probability: number }>({ name: "", color: "#6366f1", probability: 0 });
  const [addingStageTo, setAddingStageTo] = useState<string | null>(null);
  const [newStageName, setNewStageName] = useState("");

  async function createPipeline() {
    if (!newPipelineName.trim()) return;
    const res = await fetch("/api/pipelines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newPipelineName.trim() }),
    });
    const result = await res.json();
    if (result.success) {
      setPipelines((ps) => [...ps, result.data]);
      setNewPipelineName("");
      setShowNewPipeline(false);
      toast.success("Pipeline created");
    } else {
      toast.error(result.error ?? "Failed to create pipeline");
    }
  }

  async function renamePipeline(id: string) {
    if (!pipelineNameDraft.trim()) return;
    const res = await fetch(`/api/pipelines/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: pipelineNameDraft.trim() }),
    });
    const result = await res.json();
    if (result.success) {
      setPipelines((ps) => ps.map((p) => p.id === id ? { ...p, name: pipelineNameDraft.trim() } : p));
      setEditingPipeline(null);
      toast.success("Pipeline renamed");
    } else {
      toast.error(result.error ?? "Failed");
    }
  }

  async function deletePipeline(id: string) {
    if (!confirm("Delete this pipeline? This cannot be undone.")) return;
    const res = await fetch(`/api/pipelines/${id}`, { method: "DELETE" });
    const result = await res.json();
    if (result.success) {
      setPipelines((ps) => ps.filter((p) => p.id !== id));
      toast.success("Pipeline deleted");
    } else {
      toast.error(result.error ?? "Failed");
    }
  }

  async function addStage(pipelineId: string) {
    if (!newStageName.trim()) return;
    const res = await fetch(`/api/pipelines/${pipelineId}/stages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newStageName.trim() }),
    });
    const result = await res.json();
    if (result.success) {
      setPipelines((ps) => ps.map((p) => p.id === pipelineId ? { ...p, stages: [...p.stages, result.data] } : p));
      setNewStageName("");
      setAddingStageTo(null);
      toast.success("Stage added");
    } else {
      toast.error(result.error ?? "Failed");
    }
  }

  function startEditStage(stage: Stage) {
    setEditingStage(stage.id);
    setStageDraft({ name: stage.name, color: stage.color, probability: stage.probability });
  }

  async function saveStage(stageId: string, pipelineId: string) {
    if (!stageDraft.name.trim()) return;
    const res = await fetch(`/api/stages/${stageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: stageDraft.name.trim(),
        color: stageDraft.color,
        probability: Number(stageDraft.probability),
      }),
    });
    const result = await res.json();
    if (result.success) {
      setPipelines((ps) => ps.map((p) =>
        p.id === pipelineId
          ? { ...p, stages: p.stages.map((s) => s.id === stageId ? { ...s, ...result.data } : s) }
          : p
      ));
      setEditingStage(null);
      toast.success("Stage updated");
    } else {
      toast.error(result.error ?? "Failed");
    }
  }

  async function deleteStage(stageId: string, pipelineId: string) {
    if (!confirm("Delete this stage?")) return;
    const res = await fetch(`/api/stages/${stageId}`, { method: "DELETE" });
    const result = await res.json();
    if (result.success) {
      setPipelines((ps) => ps.map((p) =>
        p.id === pipelineId ? { ...p, stages: p.stages.filter((s) => s.id !== stageId) } : p
      ));
      toast.success("Stage deleted");
    } else {
      toast.error(result.error ?? "Failed");
    }
  }

  async function moveStage(stageId: string, pipelineId: string, direction: -1 | 1) {
    const pipeline = pipelines.find((p) => p.id === pipelineId);
    if (!pipeline) return;
    const idx = pipeline.stages.findIndex((s) => s.id === stageId);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= pipeline.stages.length) return;
    const a = pipeline.stages[idx];
    const b = pipeline.stages[swapIdx];

    await Promise.all([
      fetch(`/api/stages/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: b.order }),
      }),
      fetch(`/api/stages/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: a.order }),
      }),
    ]);

    setPipelines((ps) => ps.map((p) => {
      if (p.id !== pipelineId) return p;
      const stages = [...p.stages];
      stages[idx] = { ...b, order: a.order };
      stages[swapIdx] = { ...a, order: b.order };
      stages.sort((x, y) => x.order - y.order);
      return { ...p, stages };
    }));
  }

  async function createUser() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      const result = await res.json();
      if (result.success) {
        setUsers((u) => [{ ...result.data, createdAt: new Date().toISOString(), status: "active" }, ...u]);
        setNewUser({ name: "", email: "", password: "", role: "AGENT" });
        setShowNewUser(false);
        toast.success("User created successfully");
      } else {
        toast.error(result.error ?? "Failed to create user");
      }
    } catch { toast.error("Network error"); }
    finally { setSubmitting(false); }
  }

  async function updateUserRole(userId: string, role: string) {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const result = await res.json();
      if (result.success) {
        setUsers((u) => u.map((usr) => usr.id === userId ? { ...usr, role } : usr));
        setEditingUser(null);
        toast.success("Role updated");
      } else { toast.error(result.error ?? "Failed"); }
    } catch { toast.error("Network error"); }
  }

  async function toggleUserStatus(userId: string, currentStatus: string) {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const result = await res.json();
      if (result.success) {
        setUsers((u) => u.map((usr) => usr.id === userId ? { ...usr, status: newStatus } : usr));
        toast.success(`User ${newStatus === "active" ? "activated" : "deactivated"}`);
      } else { toast.error(result.error ?? "Failed"); }
    } catch { toast.error("Network error"); }
    setOpenMenu(null);
  }

  async function deleteUser(userId: string) {
    setDeletingUser(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      const result = await res.json();
      if (result.success) {
        setUsers((u) => u.filter((usr) => usr.id !== userId));
        toast.success("User deleted");
      } else { toast.error(result.error ?? "Failed to delete user"); }
    } catch { toast.error("Network error"); }
    finally { setDeletingUser(null); setOpenMenu(null); }
  }

  const tabs: { key: Tab; label: string; icon: typeof Users; count?: number }[] = [
    { key: "overview", label: "Overview", icon: Activity },
    { key: "users", label: "Users", icon: Users, count: users.length },
    { key: "lead-types", label: "Lead Types", icon: Layers, count: leadTypes.length },
    { key: "pipelines", label: "Pipelines", icon: GitBranch, count: pipelines.length },
    { key: "automations", label: "Automations", icon: Zap, count: rules.length },
  ];

  return (
    <div className="space-y-5">
      {/* Tab Bar */}
      <div className="flex gap-1 bg-white border border-gray-200 p-1 rounded-xl shadow-sm w-fit">
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
              tab === key
                ? "text-white shadow-sm"
                : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            }`}
            style={tab === key ? { background: "linear-gradient(135deg,#6366f1,#8b5cf6)" } : {}}
          >
            <Icon className="w-4 h-4" />
            {label}
            {count !== undefined && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                tab === key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
              }`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === "overview" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Total Leads", value: stats.totalLeads, icon: TrendingUp, color: "#6366f1", bg: "#eef2ff" },
              { label: "Active Users", value: stats.activeUsers, icon: Users, color: "#10b981", bg: "#d1fae5" },
              { label: "Open Tasks", value: stats.openTasks, icon: Zap, color: "#f59e0b", bg: "#fef3c7" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: bg }}>
                  <Icon className="w-6 h-6" style={{ color }} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-sm text-gray-500">{label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Recent users */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Recent Team Members</h3>
                <button onClick={() => setTab("users")} className="text-xs font-semibold text-indigo-600 hover:underline">
                  Manage →
                </button>
              </div>
              <div className="divide-y divide-gray-50">
                {users.slice(0, 5).map((u) => {
                  const rc = roleConfig[u.role] ?? roleConfig.VIEWER;
                  const RIcon = rc.icon;
                  return (
                    <div key={u.id} className="px-5 py-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                        style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                        {u.name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{u.name}</p>
                        <p className="text-xs text-gray-400 truncate">{u.email}</p>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg"
                        style={{ background: rc.bg, color: rc.color }}>
                        <RIcon className="w-3 h-3" />
                        {rc.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pipelines summary */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Pipelines</h3>
                <button onClick={() => setTab("pipelines")} className="text-xs font-semibold text-indigo-600 hover:underline">
                  View all →
                </button>
              </div>
              <div className="divide-y divide-gray-50">
                {pipelines.map((p) => (
                  <div key={p.id} className="px-5 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                      <span className="text-xs text-gray-400">{p.stages.length} stages</span>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {p.stages.slice(0, 8).map((s) => (
                        <span key={s.id} className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: s.color }} title={s.name} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── USERS ── */}
      {tab === "users" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900">Team Members</h3>
              <p className="text-xs text-gray-400 mt-0.5">{users.length} users total</p>
            </div>
            <button
              onClick={() => setShowNewUser(!showNewUser)}
              className={`${btn} flex items-center gap-2 text-white`}
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
            >
              <Plus className="w-4 h-4" /> Add User
            </button>
          </div>

          {/* New user form */}
          {showNewUser && (
            <div className="px-5 py-4 border-b border-gray-100 bg-indigo-50/40">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-sm text-gray-900">New Team Member</p>
                <button onClick={() => setShowNewUser(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input value={newUser.name} onChange={(e) => setNewUser((u) => ({ ...u, name: e.target.value }))}
                  placeholder="Full name" className={inp} />
                <input value={newUser.email} onChange={(e) => setNewUser((u) => ({ ...u, email: e.target.value }))}
                  placeholder="Email address" type="email" className={inp} />
                <input value={newUser.password} onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))}
                  placeholder="Password (min 8 chars)" type="password" className={inp} />
                <select value={newUser.role} onChange={(e) => setNewUser((u) => ({ ...u, role: e.target.value }))} className={inp}>
                  <option value="AGENT">Sales Agent</option>
                  <option value="MANAGER">Sales Manager</option>
                  <option value="ADMIN">Admin</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={createUser}
                  disabled={submitting || !newUser.name || !newUser.email || !newUser.password}
                  className={`${btn} flex items-center gap-2 text-white disabled:opacity-40`}
                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <Save className="w-3.5 h-3.5" /> Create User
                </button>
                <button onClick={() => setShowNewUser(false)} className={`${btn} border border-gray-200 text-gray-600`}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Users table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Role</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Leads</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Joined</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((user) => {
                  const rc = roleConfig[user.role] ?? roleConfig.VIEWER;
                  const RIcon = rc.icon;
                  const isDeleting = deletingUser === user.id;
                  const isMe = user.id === currentUserId;

                  return (
                    <tr key={user.id} className={`hover:bg-gray-50 transition ${user.status === "inactive" ? "opacity-50" : ""}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                            {user.name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{user.name} {isMe && <span className="text-xs text-indigo-500">(you)</span>}</p>
                            <p className="text-xs text-gray-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {editingUser === user.id ? (
                          <div className="flex items-center gap-2">
                            <select value={editRole} onChange={(e) => setEditRole(e.target.value)}
                              className="text-xs px-2 py-1 border border-indigo-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400">
                              {Object.entries(roleConfig).map(([k, v]) => (
                                <option key={k} value={k}>{v.label}</option>
                              ))}
                            </select>
                            <button onClick={() => updateUserRole(user.id, editRole)}
                              className="p-1 text-indigo-600 hover:text-indigo-800">
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingUser(null)}
                              className="p-1 text-gray-400 hover:text-gray-600">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { if (!isMe) { setEditingUser(user.id); setEditRole(user.role); } }}
                            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg hover:opacity-80 transition"
                            style={{ background: rc.bg, color: rc.color }}
                          >
                            <RIcon className="w-3 h-3" />
                            {rc.label}
                            {!isMe && <Pencil className="w-2.5 h-2.5 opacity-50" />}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1 text-xs font-semibold w-fit px-2.5 py-1 rounded-full ${
                          user.status === "active"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user.status === "active" ? "bg-emerald-500" : "bg-gray-400"}`} />
                          {user.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {user._count?.ownedLeads ?? 0}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        {!isMe && (
                          <div className="relative">
                            <button
                              onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}
                              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {openMenu === user.id && (
                              <div className="absolute right-0 top-8 z-10 bg-white rounded-xl shadow-xl border border-gray-100 w-44 overflow-hidden">
                                <button
                                  onClick={() => toggleUserStatus(user.id, user.status)}
                                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50 transition"
                                >
                                  {user.status === "active"
                                    ? <><UserX className="w-4 h-4 text-orange-500" /> Deactivate</>
                                    : <><UserCheck className="w-4 h-4 text-green-500" /> Activate</>
                                  }
                                </button>
                                <button
                                  onClick={() => deleteUser(user.id)}
                                  disabled={isDeleting}
                                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition border-t border-gray-100"
                                >
                                  {isDeleting
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <Trash2 className="w-4 h-4" />
                                  }
                                  Delete user
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── LEAD TYPES ── */}
      {tab === "lead-types" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-900 mb-4">Lead Types</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {leadTypes.map((lt) => (
              <div key={lt.id} className="border border-gray-100 rounded-xl p-5 hover:shadow-md transition">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${lt.color}20` }}>
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: lt.color }} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900">{lt.name}</h4>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${lt.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                      {lt.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                {lt.description && <p className="text-sm text-gray-500">{lt.description}</p>}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="w-full h-2 rounded-full" style={{ backgroundColor: `${lt.color}30` }}>
                    <div className="h-2 rounded-full" style={{ backgroundColor: lt.color, width: "100%" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PIPELINES ── */}
      {tab === "pipelines" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Manage pipelines and their stages.</p>
            <button
              onClick={() => setShowNewPipeline((s) => !s)}
              className={`${btn} flex items-center gap-2 text-white`}
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
            >
              <Plus className="w-4 h-4" /> New Pipeline
            </button>
          </div>

          {showNewPipeline && (
            <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-4 flex items-center gap-2">
              <input
                value={newPipelineName}
                onChange={(e) => setNewPipelineName(e.target.value)}
                placeholder="Pipeline name"
                className={inp}
                onKeyDown={(e) => { if (e.key === "Enter") createPipeline(); }}
              />
              <button onClick={createPipeline} className={`${btn} text-white`} style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                Create
              </button>
              <button onClick={() => { setShowNewPipeline(false); setNewPipelineName(""); }} className={`${btn} border border-gray-200 text-gray-600`}>
                Cancel
              </button>
            </div>
          )}

          {pipelines.map((pipeline) => (
            <div key={pipeline.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4 gap-3">
                {editingPipeline === pipeline.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      value={pipelineNameDraft}
                      onChange={(e) => setPipelineNameDraft(e.target.value)}
                      className={inp}
                      autoFocus
                      onKeyDown={(e) => { if (e.key === "Enter") renamePipeline(pipeline.id); }}
                    />
                    <button onClick={() => renamePipeline(pipeline.id)} className="p-1.5 text-indigo-600 hover:text-indigo-800">
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingPipeline(null)} className="p-1.5 text-gray-400 hover:text-gray-600">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-1">
                    <h3 className="font-bold text-gray-900 text-lg">{pipeline.name}</h3>
                    <button
                      onClick={() => { setEditingPipeline(pipeline.id); setPipelineNameDraft(pipeline.name); }}
                      className="p-1 text-gray-400 hover:text-indigo-600"
                      title="Rename pipeline"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full font-medium">
                  {pipeline.stages.length} stages
                </span>
                <button
                  onClick={() => deletePipeline(pipeline.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  title="Delete pipeline"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                {pipeline.stages.map((stage, idx) => (
                  <div key={stage.id} className="flex items-center gap-2 group">
                    <div className="flex flex-col">
                      <button
                        disabled={idx === 0}
                        onClick={() => moveStage(stage.id, pipeline.id, -1)}
                        className="p-0.5 text-gray-300 hover:text-indigo-600 disabled:opacity-20"
                        title="Move up"
                      >
                        <ChevronLeft className="w-3 h-3 rotate-90" />
                      </button>
                      <button
                        disabled={idx === pipeline.stages.length - 1}
                        onClick={() => moveStage(stage.id, pipeline.id, 1)}
                        className="p-0.5 text-gray-300 hover:text-indigo-600 disabled:opacity-20"
                        title="Move down"
                      >
                        <ChevronRight className="w-3 h-3 rotate-90" />
                      </button>
                    </div>

                    <span className="text-xs font-semibold text-gray-400 w-6 text-center">{idx + 1}</span>

                    {editingStage === stage.id ? (
                      <div className="flex items-center gap-2 flex-1 bg-indigo-50/40 rounded-lg p-2 border border-indigo-100">
                        <input
                          value={stageDraft.name}
                          onChange={(e) => setStageDraft((s) => ({ ...s, name: e.target.value }))}
                          placeholder="Stage name"
                          className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          autoFocus
                        />
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={stageDraft.probability}
                          onChange={(e) => setStageDraft((s) => ({ ...s, probability: Number(e.target.value) }))}
                          className="w-16 px-2 py-1 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          title="Probability %"
                        />
                        <span className="text-xs text-gray-400">%</span>
                        <div className="flex items-center gap-1">
                          {STAGE_PALETTE.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setStageDraft((s) => ({ ...s, color: c }))}
                              className={`w-5 h-5 rounded-full border-2 transition ${stageDraft.color === c ? "border-gray-900 scale-110" : "border-white"}`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                        <button onClick={() => saveStage(stage.id, pipeline.id)} className="p-1 text-indigo-600 hover:text-indigo-800">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingStage(null)} className="p-1 text-gray-400 hover:text-gray-600">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div
                          className="flex-1 px-3 py-2 rounded-lg text-white text-sm font-semibold flex items-center justify-between"
                          style={{ backgroundColor: stage.color }}
                        >
                          <span>
                            {stage.name}
                            {stage.isWon && <span className="ml-2 text-[10px] uppercase bg-white/20 px-1.5 py-0.5 rounded">Won</span>}
                            {stage.isLost && <span className="ml-2 text-[10px] uppercase bg-white/20 px-1.5 py-0.5 rounded">Lost</span>}
                          </span>
                          <span className="opacity-80 text-xs">{stage.probability}%</span>
                        </div>
                        <button
                          onClick={() => startEditStage(stage)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          title="Edit stage"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteStage(stage.id, pipeline.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          title="Delete stage"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                ))}

                {addingStageTo === pipeline.id ? (
                  <div className="flex items-center gap-2 mt-3">
                    <input
                      value={newStageName}
                      onChange={(e) => setNewStageName(e.target.value)}
                      placeholder="New stage name"
                      className={inp}
                      autoFocus
                      onKeyDown={(e) => { if (e.key === "Enter") addStage(pipeline.id); }}
                    />
                    <button onClick={() => addStage(pipeline.id)} className={`${btn} text-white`} style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                      Add
                    </button>
                    <button onClick={() => { setAddingStageTo(null); setNewStageName(""); }} className={`${btn} border border-gray-200 text-gray-600`}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingStageTo(pipeline.id)}
                    className="mt-2 flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    <Plus className="w-4 h-4" /> Add stage
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── AUTOMATIONS ── */}
      {tab === "automations" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Automation Rules</h3>
            <p className="text-xs text-gray-400 mt-0.5">Automatic actions triggered by pipeline events</p>
          </div>
          <div className="divide-y divide-gray-50">
            {rules.map((rule) => (
              <div key={rule.id} className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${rule.isActive ? "bg-emerald-500" : "bg-gray-300"}`} />
                <div className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0"
                  style={{ background: rule.isActive ? "#eef2ff" : "#f3f4f6" }}>
                  <Zap className={`w-5 h-5 ${rule.isActive ? "text-indigo-600" : "text-gray-400"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900">{rule.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Trigger: <span className="font-mono">{rule.trigger}</span></p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    rule.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {rule.isActive ? "Active" : "Inactive"}
                  </span>
                  <p className="text-xs text-gray-300">{formatDate(rule.createdAt)}</p>
                </div>
              </div>
            ))}
            {rules.length === 0 && (
              <div className="flex flex-col items-center py-12 gap-2 text-gray-400">
                <Zap className="w-8 h-8 opacity-30" />
                <p className="text-sm">No automation rules configured</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
