"use client";

import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, FunnelChart, Funnel, LabelList,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

export interface TimeSeriesPoint {
  label: string;
  value: number;
}

export interface RevenuePoint {
  label: string;
  revenue: number;
  deals: number;
}

export interface FunnelPoint {
  name: string;
  value: number;
  fill: string;
}

export interface SourceSlice {
  name: string;
  value: number;
}

export interface WinRateRow {
  name: string;
  total: number;
  won: number;
  rate: number;
  color: string;
}

export interface AgentRow {
  name: string;
  total: number;
  won: number;
  revenue: number;
  rate: number;
}

const PIE_COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#6b7280"];

export function LeadsOverTimeChart({ data }: { data: TimeSeriesPoint[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">Leads Created</h3>
          <p className="text-xs text-gray-400">Last 90 days, weekly</p>
        </div>
        <p className="text-sm font-semibold text-indigo-600">
          {data.reduce((sum, d) => sum + d.value, 0)} total
        </p>
      </div>
      {data.length === 0 ? (
        <div className="h-56 flex items-center justify-center text-sm text-gray-300">No data</div>
      ) : (
        <ResponsiveContainer width="100%" height={224}>
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
              formatter={(v: number) => [`${v} leads`, ""]}
            />
            <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function RevenueByMonthChart({ data }: { data: RevenuePoint[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">Won Revenue</h3>
          <p className="text-xs text-gray-400">Last 6 months, by close month</p>
        </div>
        <p className="text-sm font-semibold text-emerald-600">
          {formatCurrency(data.reduce((s, d) => s + d.revenue, 0))}
        </p>
      </div>
      {data.length === 0 ? (
        <div className="h-56 flex items-center justify-center text-sm text-gray-300">No closed deals yet</div>
      ) : (
        <ResponsiveContainer width="100%" height={224}>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickFormatter={(v) => `$${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
              formatter={(v: number, name: string) =>
                name === "revenue" ? [formatCurrency(v), "Revenue"] : [`${v} deals`, "Deals"]
              }
            />
            <Bar dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function PipelineFunnel({ data }: { data: FunnelPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Pipeline Funnel</h3>
        <div className="h-48 flex items-center justify-center text-sm text-gray-300">No active leads</div>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-3">Pipeline Funnel</h3>
      <ResponsiveContainer width="100%" height={260}>
        <FunnelChart>
          <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }} />
          <Funnel dataKey="value" data={data} isAnimationActive>
            <LabelList position="right" fill="#374151" stroke="none" fontSize={12} dataKey="name" />
            <LabelList position="center" fill="#fff" stroke="none" fontSize={11} fontWeight="bold" dataKey="value" />
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SourceBreakdown({ data }: { data: SourceSlice[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Lead Sources</h3>
        <div className="h-48 flex items-center justify-center text-sm text-gray-300">No source data</div>
      </div>
    );
  }
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-3">Lead Sources</h3>
      <div className="grid grid-cols-2 gap-2">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Tooltip
              contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
              formatter={(v: number) => [`${v} leads (${Math.round((v / total) * 100)}%)`, ""]}
            />
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
              {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-1.5 self-center">
          {data.map((slice, i) => (
            <div key={slice.name} className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
              <span className="text-gray-700 flex-1 truncate">{slice.name}</span>
              <span className="font-semibold text-gray-900">{slice.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function WinRateByType({ rows }: { rows: WinRateRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Win Rate by Lead Type</h3>
        <div className="h-32 flex items-center justify-center text-sm text-gray-300">No data</div>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-4">Win Rate by Lead Type</h3>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.name}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-gray-700">{row.name}</span>
              <div className="flex gap-3 text-gray-500">
                <span>{row.won} / {row.total}</span>
                <span className="font-semibold" style={{ color: row.color }}>{row.rate}%</span>
              </div>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${row.rate}%`, backgroundColor: row.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AgentLeaderboard({ rows }: { rows: AgentRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Agent Leaderboard</h3>
        <div className="h-32 flex items-center justify-center text-sm text-gray-300">No agent data</div>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-4">Agent Leaderboard</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 uppercase tracking-wider">
              <th className="text-left pb-2 font-semibold">#</th>
              <th className="text-left pb-2 font-semibold">Agent</th>
              <th className="text-right pb-2 font-semibold">Leads</th>
              <th className="text-right pb-2 font-semibold">Won</th>
              <th className="text-right pb-2 font-semibold">Win&nbsp;%</th>
              <th className="text-right pb-2 font-semibold">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((row, idx) => (
              <tr key={row.name} className="hover:bg-gray-50">
                <td className="py-2 text-xs text-gray-400">{idx + 1}</td>
                <td className="py-2 font-medium text-gray-900">{row.name}</td>
                <td className="py-2 text-right text-gray-700">{row.total}</td>
                <td className="py-2 text-right text-emerald-700 font-semibold">{row.won}</td>
                <td className="py-2 text-right text-gray-700">{row.rate}%</td>
                <td className="py-2 text-right font-semibold text-gray-900">{formatCurrency(row.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
