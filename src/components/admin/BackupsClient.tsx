"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Database, Download, RefreshCw, Loader2, AlertTriangle, Shield } from "lucide-react";

type Snapshot = {
  id: string;
  createdAt: string;
  triggeredBy: string;
  triggeredById: string | null;
  entityCounts: Record<string, number>;
  sizeBytes: number;
};

function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleString();
}

export default function BackupsClient() {
  const [items, setItems] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/backups");
      const json = await res.json();
      if (res.ok) setItems(json.data);
      else toast.error(json.error ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createNow() {
    setCreating(true);
    try {
      const res = await fetch("/api/backups", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed");
        return;
      }
      toast.success("Snapshot created");
      await load();
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-50 border border-indigo-200">
        <Shield className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-bold text-indigo-900 text-sm">Automatic daily snapshots</p>
          <p className="text-xs text-indigo-800 mt-0.5 leading-relaxed">
            A cron job creates a full JSON snapshot of every entity each day, kept for 30 days.
            For protection against a full database wipe (like the one on 2026-05-06),
            <strong> download the JSON file weekly and store it outside Neon</strong> (Google Drive, GitHub, your laptop).
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#eef2ff,#f5f3ff)" }}>
            <Database className="w-5 h-5" style={{ color: "#6366f1" }} />
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-900">Snapshots</h2>
            <p className="text-xs text-gray-400">{items.length} stored</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Reload
          </button>
          <button
            onClick={createNow}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-xl transition hover:opacity-90 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            {creating ? "Creating..." : "Create snapshot now"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        {loading && items.length === 0 ? (
          <p className="p-8 text-sm text-gray-400 text-center">Loading...</p>
        ) : items.length === 0 ? (
          <div className="p-8 text-center">
            <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <p className="text-base font-bold text-gray-700 mb-1">No snapshots yet</p>
            <p className="text-sm text-gray-400 mb-4">
              Click <strong>Create snapshot now</strong> above to make your first backup.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-gray-400 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-bold">Created</th>
                <th className="text-left px-4 py-3 font-bold">Trigger</th>
                <th className="text-left px-4 py-3 font-bold">Entities</th>
                <th className="text-left px-4 py-3 font-bold">Size</th>
                <th className="text-right px-4 py-3 font-bold">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => {
                const counts = s.entityCounts ?? {};
                const totalRows = Object.values(counts).reduce((sum, n) => sum + (n as number), 0);
                return (
                  <tr key={s.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 text-gray-800 font-semibold">{fmtDate(s.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        s.triggeredBy === "cron"
                          ? "bg-indigo-50 text-indigo-700"
                          : "bg-amber-50 text-amber-700"
                      }`}>
                        {s.triggeredBy}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className="font-bold text-gray-900">{totalRows}</span> rows
                      <span className="text-xs text-gray-400 ml-2">
                        ({counts.leads ?? 0} leads · {counts.users ?? 0} users · {counts.activities ?? 0} activities)
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{fmtSize(s.sizeBytes)}</td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={`/api/backups/${s.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white rounded-lg transition hover:opacity-90"
                        style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download JSON
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
