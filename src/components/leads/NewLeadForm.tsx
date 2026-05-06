"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import type { LeadType, Pipeline, Stage } from "@prisma/client";

const optionalString = z.preprocess(
  (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().optional()
);

const optionalNumber = z.preprocess(
  (v: unknown) => (v === "" || v === null || v === undefined || (typeof v === "number" && Number.isNaN(v)) ? undefined : v),
  z.coerce.number().optional()
);

const schema = z.object({
  displayName: optionalString,
  companyName: optionalString,
  email: z.preprocess(
    (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().email().optional()
  ),
  phone: optionalString,
  country: optionalString,
  source: optionalString,
  leadTypeId: optionalString,
  pipelineId: optionalString,
  stageId: optionalString,
  ownerId: optionalString,
  potentialAmount: optionalNumber,
  currency: optionalString,
  priority: z.preprocess(
    (v: unknown) => (v === "" || v === null || v === undefined ? undefined : v),
    z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional()
  ),
  nextFollowUpAt: optionalString,
  note: optionalString,
});

type FormData = z.infer<typeof schema>;

interface Props {
  leadTypes: LeadType[];
  pipelines: (Pipeline & { stages: Stage[] })[];
  agents: { id: string; name: string }[];
  currentUserId: string;
  isAdmin: boolean;
}

export default function NewLeadForm({ leadTypes, pipelines, agents, currentUserId, isAdmin }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedPipeline, setSelectedPipeline] = useState<string>("");

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const selectedLeadTypeId = watch("leadTypeId");

  function handleLeadTypeChange(ltId: string) {
    setValue("leadTypeId", ltId);
    const lt = leadTypes.find((l) => l.id === ltId);
    if (lt?.defaultPipelineId) {
      setValue("pipelineId", lt.defaultPipelineId);
      setSelectedPipeline(lt.defaultPipelineId);
      // Auto-select first stage
      const pipeline = pipelines.find((p) => p.id === lt.defaultPipelineId);
      const firstStage = pipeline?.stages?.[0];
      if (firstStage) setValue("stageId", firstStage.id);
    }
  }

  const currentStages = pipelines.find((p) => p.id === selectedPipeline)?.stages ?? [];

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, ownerId: data.ownerId || currentUserId }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Lead created successfully");
        router.push(`/leads/${result.data.id}`);
      } else {
        toast.error(result.error ?? "Failed to create lead");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";
  const errorCls = "text-xs text-red-500 mt-1";

  return (
    <div>
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Create New Lead</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Lead Type */}
          <div>
            <label className={labelCls}>Lead Type</label>
            <select
              {...register("leadTypeId")}
              onChange={(e) => handleLeadTypeChange(e.target.value)}
              className={inputCls}
            >
              <option value="">Select type...</option>
              {leadTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>{lt.name}</option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Full Name</label>
              <input {...register("displayName")} placeholder="Daniel Cohen" className={inputCls} />
              {errors.displayName && <p className={errorCls}>{errors.displayName.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Company / Fund</label>
              <input {...register("companyName")} placeholder="Alpha Ventures" className={inputCls} />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Email</label>
              <input {...register("email")} type="email" placeholder="daniel@fund.com" className={inputCls} />
              {errors.email && <p className={errorCls}>{errors.email.message}</p>}
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input {...register("phone")} placeholder="+1 555 000 0000" className={inputCls} />
            </div>
          </div>

          {/* Location + Source */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Country</label>
              <input {...register("country")} placeholder="US" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Source</label>
              <select {...register("source")} className={inputCls}>
                <option value="">Select source...</option>
                <option>Referral</option>
                <option>Website</option>
                <option>LinkedIn</option>
                <option>Conference</option>
                <option>Cold Outreach</option>
                <option>Telegram</option>
                <option>WhatsApp</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          {/* Pipeline + Stage */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Pipeline</label>
              <select
                {...register("pipelineId")}
                onChange={(e) => {
                  setValue("pipelineId", e.target.value);
                  setSelectedPipeline(e.target.value);
                  setValue("stageId", "");
                }}
                className={inputCls}
              >
                <option value="">Select pipeline...</option>
                {pipelines.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Stage</label>
              <select {...register("stageId")} className={inputCls} disabled={!selectedPipeline}>
                <option value="">Select stage...</option>
                {currentStages.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount + Currency */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Potential Amount</label>
              <input
                {...register("potentialAmount")}
                type="number"
                placeholder="250000"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Currency</label>
              <select {...register("currency")} className={inputCls} defaultValue="">
                <option value="">—</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="ILS">ILS</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          {/* Priority + Follow-up */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Priority</label>
              <select {...register("priority")} className={inputCls} defaultValue="">
                <option value="">—</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Next Follow-up</label>
              <input {...register("nextFollowUpAt")} type="date" className={inputCls} />
            </div>
          </div>

          {/* Owner (managers only) */}
          {isAdmin && agents.length > 0 && (
            <div>
              <label className={labelCls}>Assigned to</label>
              <select {...register("ownerId")} className={inputCls}>
                <option value="">Me ({currentUserId})</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Initial note */}
          <div>
            <label className={labelCls}>Initial Note</label>
            <textarea
              {...register("note")}
              rows={3}
              placeholder="Add context about this lead..."
              className={inputCls}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? "Creating..." : "Create Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
