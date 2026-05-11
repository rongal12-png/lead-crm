"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Trash2, RotateCcw, Users as UsersIcon, CheckSquare, User, Loader2 } from "lucide-react";

type Lead = {
  id: string;
  displayName: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  potentialAmount: number | null;
  currency: string;
  updatedAt: string;
  owner: { id: string; name: string } | null;
  leadType: { name: string } | null;
};

type Task = {
  id: string;
  title: string;
  type: string;
  dueAt: string | null;
  updatedAt: string;
  lead: { id: string; displayName: string } | null;
  assignee: { id: string; name: string } | null;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  updatedAt: string;
};

type TrashData = {
  archivedLeads: Lead[];
  cancelledTasks: Task[];
  inactiveUsers: UserRow[];
};

type Tab = "leads" | "tasks" | "users";

function fmtDate(d: string): string {
  return new Date(d).toLocaleString();
}

export default function TrashClient() {
  const [data, setData] = useState<TrashData | null>(null);
  const [tab, setTab] = useState<Tab>("leads");
  const [restoring, setRestoring] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/trash");
    const json = await res.json();
    if (res.ok) setData(json.data);
    else toast.error(json.error ?? "Failed to load trash");
  }

  useEffect(() => {
    load();
  }, []);

  async function restore(kind: "lead" | "task" | "user", id: string) {
    setRestoring(id);
    try {
      const res = await fetch("/api/trash/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Restore failed");
        return;
      }
      toast.success("Restored");
      await load();
    } catch {
      toast.error("Network error");
    } finally {
      setRestoring(null);
    }
  }

  if (!data) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    );
  }

  const tabs: { key: Tab; label: string; count: number; icon: typeof UsersIcon }[] = [
    { key: "leads", label: "Archived leads", count: data.archivedLeads.length, icon: UsersIcon },
    { key: "tasks", label: "Cancelled tasks", count: data.cancelledTasks.length, icon: CheckSquare },
    { key: "users", label: "Inactive users", count: data.inactiveUsers.length, icon: User },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
        <Trash2 className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-amber-900 text-sm">Soft-deleted records</p>
          <p className="text-xs text-amber-800 mt-0.5">
            Nothing here is permanently deleted. Click <strong>Restore</strong> to move an item
            back to its active state. Records may stay here indefinitely.
          </p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 -mb-px transition ${
                active
                  ? "border-indigo-500 text-indigo-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full font-black ${
                  active ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {tab === "leads" && (
        <div className="bg-white rounded-2xl border border-gray-100"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          {data.archivedLeads.length === 0 ? (
            <p className="p-8 text-sm text-gray-400 italic text-center">No archived leads</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-gray-400 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-bold">Lead</th>
                  <th className="text-left px-4 py-3 font-bold">Type</th>
                  <th className="text-left px-4 py-3 font-bold">Owner</th>
                  <th className="text-left px-4 py-3 font-bold">Archived</th>
                  <th className="text-right px-4 py-3 font-bold">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.archivedLeads.map((l) => (
                  <tr key={l.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/leads/${l.id}`} className="font-bold text-gray-900 hover:text-indigo-700">
                        {l.displayName}
                      </Link>
                      {l.companyName && <p className="text-xs text-gray-400">{l.companyName}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{l.leadType?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{l.owner?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(l.updatedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => restore("lead", l.id)}
                        disabled={restoring === l.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition disabled:opacity-60"
                      >
                        {restoring === l.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "tasks" && (
        <div className="bg-white rounded-2xl border border-gray-100"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          {data.cancelledTasks.length === 0 ? (
            <p className="p-8 text-sm text-gray-400 italic text-center">No cancelled tasks</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-gray-400 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-bold">Task</th>
                  <th className="text-left px-4 py-3 font-bold">Lead</th>
                  <th className="text-left px-4 py-3 font-bold">Assignee</th>
                  <th className="text-left px-4 py-3 font-bold">Cancelled</th>
                  <th className="text-right px-4 py-3 font-bold">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.cancelledTasks.map((t) => (
                  <tr key={t.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-bold text-gray-900">{t.title}</p>
                      <p className="text-xs text-gray-400">{t.type}</p>
                    </td>
                    <td className="px-4 py-3">
                      {t.lead ? (
                        <Link href={`/leads/${t.lead.id}`} className="text-indigo-700 hover:underline">
                          {t.lead.displayName}
                        </Link>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{t.assignee?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(t.updatedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => restore("task", t.id)}
                        disabled={restoring === t.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition disabled:opacity-60"
                      >
                        {restoring === t.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "users" && (
        <div className="bg-white rounded-2xl border border-gray-100"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          {data.inactiveUsers.length === 0 ? (
            <p className="p-8 text-sm text-gray-400 italic text-center">No inactive users</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-gray-400 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-bold">Name</th>
                  <th className="text-left px-4 py-3 font-bold">Email</th>
                  <th className="text-left px-4 py-3 font-bold">Role</th>
                  <th className="text-left px-4 py-3 font-bold">Deactivated</th>
                  <th className="text-right px-4 py-3 font-bold">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.inactiveUsers.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 font-bold text-gray-900">{u.name}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3 text-gray-600">{u.role}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(u.updatedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => restore("user", u.id)}
                        disabled={restoring === u.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition disabled:opacity-60"
                      >
                        {restoring === u.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
