"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Users, Layers, GitBranch, Zap, Plus, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

interface LeadType {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  color: string;
}

interface Stage {
  id: string;
  name: string;
  order: number;
  probability: number;
  color: string;
  isWon: boolean;
  isLost: boolean;
}

interface Pipeline {
  id: string;
  name: string;
  description: string | null;
  stages: Stage[];
}

interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  isActive: boolean;
  createdAt: string;
}

interface Props {
  users: User[];
  leadTypes: LeadType[];
  pipelines: Pipeline[];
  automationRules: AutomationRule[];
}

export default function AdminClient({ users: initialUsers, leadTypes, pipelines, automationRules }: Props) {
  const [tab, setTab] = useState<"users" | "lead-types" | "pipelines" | "automations">("users");
  const [users, setUsers] = useState(initialUsers);
  const [showNewUser, setShowNewUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "AGENT" });
  const [submitting, setSubmitting] = useState(false);

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
        setUsers((u) => [result.data, ...u]);
        setNewUser({ name: "", email: "", password: "", role: "AGENT" });
        setShowNewUser(false);
        toast.success("User created");
      } else {
        toast.error(result.error ?? "Failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  const tabs = [
    { key: "users", label: "Users", icon: Users, count: users.length },
    { key: "lead-types", label: "Lead Types", icon: Layers, count: leadTypes.length },
    { key: "pipelines", label: "Pipelines", icon: GitBranch, count: pipelines.length },
    { key: "automations", label: "Automations", icon: Zap, count: automationRules.length },
  ] as const;

  const inp = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === key ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            <Icon className="w-4 h-4" />
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === key ? "bg-indigo-100 text-indigo-700" : "bg-gray-200 text-gray-500"}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Users */}
      {tab === "users" && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Team Members</h3>
            <button
              onClick={() => setShowNewUser(!showNewUser)}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" /> Add User
            </button>
          </div>

          {showNewUser && (
            <div className="p-4 border-b border-gray-100 bg-gray-50 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input value={newUser.name} onChange={(e) => setNewUser((u) => ({ ...u, name: e.target.value }))} placeholder="Full name" className={inp} />
                <input value={newUser.email} onChange={(e) => setNewUser((u) => ({ ...u, email: e.target.value }))} placeholder="Email" type="email" className={inp} />
                <input value={newUser.password} onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))} placeholder="Password (min 8 chars)" type="password" className={inp} />
                <select value={newUser.role} onChange={(e) => setNewUser((u) => ({ ...u, role: e.target.value }))} className={inp}>
                  <option value="AGENT">Sales Agent</option>
                  <option value="MANAGER">Sales Manager</option>
                  <option value="ADMIN">Admin</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={createUser} disabled={submitting || !newUser.name || !newUser.email || !newUser.password} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg disabled:opacity-40 flex items-center gap-1">
                  {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
                  Create User
                </button>
                <button onClick={() => setShowNewUser(false)} className="px-4 py-2 border border-gray-200 text-sm rounded-lg">Cancel</button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Role</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{user.name}</td>
                    <td className="px-4 py-3 text-gray-500">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${user.role === "ADMIN" ? "bg-red-100 text-red-700" : user.role === "MANAGER" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${user.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{formatDate(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lead Types */}
      {tab === "lead-types" && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Lead Types</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {leadTypes.map((lt) => (
              <div key={lt.id} className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: lt.color }} />
                  <h4 className="font-semibold text-gray-900">{lt.name}</h4>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${lt.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {lt.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                {lt.description && <p className="text-sm text-gray-500">{lt.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pipelines */}
      {tab === "pipelines" && (
        <div className="space-y-4">
          {pipelines.map((pipeline) => (
            <div key={pipeline.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">{pipeline.name}</h3>
              <div className="flex flex-wrap gap-2">
                {pipeline.stages.map((stage) => (
                  <div
                    key={stage.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border"
                    style={{ borderColor: stage.color, backgroundColor: `${stage.color}15` }}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                    <span className="font-medium" style={{ color: stage.color }}>{stage.name}</span>
                    <span className="text-xs opacity-60">{stage.probability}%</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Automations */}
      {tab === "automations" && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Automation Rules</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {automationRules.map((rule) => (
              <div key={rule.id} className="p-4 flex items-center gap-4">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${rule.isActive ? "bg-green-500" : "bg-gray-300"}`} />
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-900">{rule.name}</p>
                  <p className="text-xs text-gray-400">Trigger: {rule.trigger}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${rule.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {rule.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
            {automationRules.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">No automation rules</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
