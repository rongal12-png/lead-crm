"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Save, X, Loader2, FileText, History } from "lucide-react";

type KaiTermsDoc = {
  id: string;
  title: string;
  content: string;
  version: number;
  updatedAt: string;
};

interface Props {
  initial: KaiTermsDoc;
}

function renderInline(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-gray-100 text-[12px]">$1</code>');
}

function renderMarkdown(src: string): string {
  const lines = src.split(/\r?\n/);
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^##\s+/.test(line)) {
      out.push(`<h2 class="text-lg font-black text-gray-900 mt-6 mb-2 leading-tight">${renderInline(line.replace(/^##\s+/, ""))}</h2>`);
      i++;
      continue;
    }
    if (/^#\s+/.test(line)) {
      out.push(`<h1 class="text-xl font-black text-gray-900 mt-6 mb-3">${renderInline(line.replace(/^#\s+/, ""))}</h1>`);
      i++;
      continue;
    }

    // Markdown table
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
      const header = line
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((c) => c.trim());
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        rows.push(
          lines[i]
            .trim()
            .replace(/^\||\|$/g, "")
            .split("|")
            .map((c) => c.trim())
        );
        i++;
      }
      out.push(
        `<div class="my-4 overflow-x-auto"><table class="w-full text-sm border-collapse"><thead><tr>${header
          .map(
            (h) =>
              `<th class="border border-gray-200 bg-gray-50 px-3 py-2 text-right font-bold text-gray-800">${renderInline(h)}</th>`
          )
          .join("")}</tr></thead><tbody>${rows
          .map(
            (r) =>
              `<tr>${r
                .map(
                  (c) =>
                    `<td class="border border-gray-200 px-3 py-2 text-gray-700 align-top">${renderInline(c)}</td>`
                )
                .join("")}</tr>`
          )
          .join("")}</tbody></table></div>`
      );
      continue;
    }

    // Bullet list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(`<li class="leading-relaxed">${renderInline(lines[i].replace(/^\s*[-*]\s+/, ""))}</li>`);
        i++;
      }
      out.push(`<ul class="list-disc pr-6 my-3 space-y-1 text-gray-700">${items.join("")}</ul>`);
      continue;
    }

    if (line.trim() === "") {
      out.push("");
      i++;
      continue;
    }

    out.push(`<p class="text-gray-700 leading-7 my-2">${renderInline(line)}</p>`);
    i++;
  }

  return out.join("\n");
}

export default function KaiTermsEditor({ initial }: Props) {
  const [doc, setDoc] = useState<KaiTermsDoc>(initial);
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(initial.title);
  const [draftContent, setDraftContent] = useState(initial.content);
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setDraftTitle(doc.title);
    setDraftContent(doc.content);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
  }

  async function save() {
    if (!draftContent.trim()) {
      toast.error("התוכן לא יכול להיות ריק");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/kai-terms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: draftTitle, content: draftContent }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error ?? "שמירה נכשלה");
        return;
      }
      setDoc({
        id: result.data.id,
        title: result.data.title,
        content: result.data.content,
        version: result.data.version,
        updatedAt: result.data.updatedAt,
      });
      setEditing(false);
      toast.success("המסמך נשמר");
    } catch {
      toast.error("שגיאת רשת");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#eef2ff,#f5f3ff)" }}
          >
            <FileText className="w-5 h-5" style={{ color: "#6366f1" }} />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900">{doc.title}</h2>
            <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
              <History className="w-3 h-3" />
              <span>גרסה {doc.version} · עודכן {new Date(doc.updatedAt).toLocaleString("he-IL")}</span>
            </div>
          </div>
        </div>

        {!editing ? (
          <button
            onClick={startEdit}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-xl transition hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
          >
            <Pencil className="w-4 h-4" />
            עריכה
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={cancel}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 bg-white border-2 border-gray-200 rounded-xl transition hover:bg-gray-50 disabled:opacity-60"
            >
              <X className="w-4 h-4" />
              ביטול
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-xl transition hover:opacity-90 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "שומר..." : "שמור"}
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-3 bg-white rounded-2xl border border-gray-100 p-5"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-400 mb-1.5">כותרת</label>
            <input
              dir="rtl"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              className="w-full px-3 py-2.5 text-base font-bold border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-gray-400 mb-1.5">
              תוכן <span className="font-normal normal-case">(תומך ב־Markdown: ##, **bold**, טבלאות, רשימות)</span>
            </label>
            <textarea
              dir="rtl"
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              rows={28}
              className="w-full px-4 py-3 text-sm leading-7 font-mono border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 transition resize-y"
              style={{ fontFamily: "ui-monospace, 'Menlo', monospace" }}
            />
          </div>

          <p className="text-xs text-gray-400">
            לאחר שמירה, הגרסה תועלה ל־{doc.version + 1} ויירשם משתמש מעדכן.
          </p>
        </div>
      ) : (
        <article
          className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(doc.content) }}
        />
      )}
    </div>
  );
}
