"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { User, Save, Loader2, Mail, Shield, Calendar } from "lucide-react";
import { getInitials } from "@/lib/utils";

interface Props {
  initial: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  };
}

export default function ProfileForm({ initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [saving, setSaving] = useState(false);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("השם לא יכול להיות ריק");
      return;
    }
    if (trimmed === initial.name) {
      toast.info("השם לא השתנה");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        toast.error(result.error ?? "שמירה נכשלה");
        return;
      }
      toast.success("השם עודכן");
      router.refresh();
    } catch {
      toast.error("שגיאת רשת");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl" dir="rtl">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
          >
            {getInitials(name)}
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900">{name}</h2>
            <p className="text-sm text-gray-400">{initial.email}</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-gray-400 mb-1.5">
            שם תצוגה
          </label>
          <div className="flex gap-2">
            <input
              dir="rtl"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="שם מלא"
              className="flex-1 px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400"
            />
            <button
              onClick={save}
              disabled={saving || name.trim() === initial.name || !name.trim()}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white rounded-xl transition hover:opacity-90 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "שומר..." : "שמור"}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            השם הזה יוצג בפעולות שלך, בהקצאת לידים ובדוחות.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6"
        style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <h3 className="text-sm font-black uppercase tracking-wide text-gray-400 mb-4">פרטי חשבון</h3>
        <div className="space-y-3 text-sm">
          <Row icon={Mail} label="אימייל" value={initial.email} />
          <Row icon={Shield} label="הרשאה" value={initial.role === "ADMIN" ? "אדמין" : "משתמש"} />
          <Row icon={Calendar} label="חבר מאז" value={new Date(initial.createdAt).toLocaleDateString("he-IL")} />
        </div>
        <p className="text-xs text-gray-400 mt-5 leading-relaxed">
          שינוי אימייל / סיסמה / הרשאה — דרך מסך <strong>Back Office</strong> (אדמין בלבד).
        </p>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="font-semibold text-gray-800 truncate">{value}</p>
      </div>
    </div>
  );
}
