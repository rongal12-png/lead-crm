"use client";

import { useState } from "react";
import { Sparkles, Bug, Wrench, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { VERSION_LOG, CURRENT_VERSION, type VersionEntry, type ChangeKind } from "@/lib/version-log";

type Lang = "he" | "en";

const KIND_META: Record<ChangeKind, { color: string; bg: string; iconColor: string; labelHe: string; labelEn: string; icon: typeof Sparkles }> = {
  feature: { color: "#4338ca", bg: "#eef2ff", iconColor: "#6366f1", labelHe: "תכונה חדשה", labelEn: "Feature", icon: Sparkles },
  improvement: { color: "#0e7490", bg: "#cffafe", iconColor: "#06b6d4", labelHe: "שיפור", labelEn: "Improvement", icon: Wrench },
  fix: { color: "#15803d", bg: "#dcfce7", iconColor: "#22c55e", labelHe: "תיקון", labelEn: "Fix", icon: Bug },
  breaking: { color: "#b91c1c", bg: "#fee2e2", iconColor: "#ef4444", labelHe: "שינוי שובר", labelEn: "Breaking", icon: AlertTriangle },
};

const TYPE_BADGE: Record<VersionEntry["type"], { bg: string; color: string; labelHe: string; labelEn: string }> = {
  major: { bg: "#7c3aed", color: "white", labelHe: "מהדורה ראשית", labelEn: "Major" },
  minor: { bg: "#4f46e5", color: "white", labelHe: "תת-גרסה", labelEn: "Minor" },
  patch: { bg: "#0891b2", color: "white", labelHe: "תיקון", labelEn: "Patch" },
};

const T = {
  he: {
    title: "לוג גרסאות",
    subtitle: "כל השינויים המשמעותיים במערכת לאורך זמן.",
    currentVersion: "גרסה נוכחית",
    released: "הופץ",
    switchLang: "English",
    noChanges: "אין שינויים להצגה.",
    expand: "פרוס",
    collapse: "כווץ",
  },
  en: {
    title: "Version Log",
    subtitle: "All notable changes to the system over time.",
    currentVersion: "Current version",
    released: "Released",
    switchLang: "עברית",
    noChanges: "No changes to display.",
    expand: "Expand",
    collapse: "Collapse",
  },
};

function fmtDate(iso: string, lang: Lang): string {
  const locale = lang === "he" ? "he-IL" : "en-GB";
  return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
}

export default function ChangelogView() {
  const [lang, setLang] = useState<Lang>("he");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const dir = lang === "he" ? "rtl" : "ltr";
  const t = T[lang];

  function toggle(version: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(version)) next.delete(version);
      else next.add(version);
      return next;
    });
  }

  return (
    <div dir={dir} className="space-y-6 max-w-4xl">
      {/* Top banner */}
      <div
        className="rounded-2xl p-6 text-white"
        style={{
          background: "linear-gradient(135deg,#4f46e5 0%,#7c3aed 50%,#9333ea 100%)",
          boxShadow: "0 8px 24px rgba(79,70,229,0.18)",
        }}
      >
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs font-black uppercase tracking-widest opacity-80">{t.title}</div>
            <h1 className="text-2xl md:text-3xl font-black mt-1">LeadOS</h1>
            <p className="text-sm opacity-90 mt-1">{t.subtitle}</p>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-bold uppercase tracking-wider opacity-80">{t.currentVersion}</div>
            <div className="text-3xl font-black mt-0.5">v{CURRENT_VERSION}</div>
          </div>
        </div>
        <button
          onClick={() => setLang(lang === "he" ? "en" : "he")}
          className="mt-4 text-xs font-bold px-3 py-1.5 rounded-lg transition"
          style={{ background: "rgba(255,255,255,0.18)", color: "white", border: "1px solid rgba(255,255,255,0.3)" }}
        >
          {t.switchLang}
        </button>
      </div>

      {/* Timeline */}
      {VERSION_LOG.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
          {t.noChanges}
        </div>
      ) : (
        <div className="space-y-4">
          {VERSION_LOG.map((entry, idx) => {
            const isCollapsed = collapsed.has(entry.version);
            const typeBadge = TYPE_BADGE[entry.type];
            const title = lang === "he" ? entry.titleHe ?? entry.title : entry.title;
            return (
              <div
                key={entry.version}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
              >
                <button
                  onClick={() => toggle(entry.version)}
                  className="w-full p-5 text-start hover:bg-gray-50/50 transition flex items-start gap-3"
                >
                  <div className="flex-shrink-0 mt-1">
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-gray-400" style={{ transform: lang === "he" ? "scaleX(-1)" : "none" }} />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xl font-black text-gray-900">v{entry.version}</span>
                      <span
                        className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full"
                        style={{ background: typeBadge.bg, color: typeBadge.color, letterSpacing: 0.8 }}
                      >
                        {lang === "he" ? typeBadge.labelHe : typeBadge.labelEn}
                      </span>
                      {idx === 0 && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                          {lang === "he" ? "אחרון" : "Latest"}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-gray-800 mt-1">{title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {t.released} {fmtDate(entry.date, lang)} · {entry.changes.length} {lang === "he" ? "שינויים" : "changes"}
                    </p>
                  </div>
                </button>

                {!isCollapsed && (
                  <div className="px-5 pb-5 pt-1">
                    <ul className="space-y-2 mt-2">
                      {entry.changes.map((change, i) => {
                        const meta = KIND_META[change.kind];
                        const Icon = meta.icon;
                        const desc = lang === "he" ? change.descriptionHe ?? change.description : change.description;
                        return (
                          <li key={i} className="flex items-start gap-3 text-sm">
                            <div
                              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5"
                              style={{ background: meta.bg }}
                            >
                              <Icon className="w-3.5 h-3.5" style={{ color: meta.iconColor }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span
                                className="inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-full me-2"
                                style={{ background: meta.bg, color: meta.color, letterSpacing: 0.6 }}
                              >
                                {lang === "he" ? meta.labelHe : meta.labelEn}
                              </span>
                              <span className="text-gray-700 leading-relaxed">{desc}</span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
