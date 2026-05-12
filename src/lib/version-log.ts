/**
 * Version log for LeadOS CRM.
 *
 * Update this file whenever a meaningful change is shipped:
 *   1. Bump the version in package.json (and the displayed version in Sidebar/backup.ts).
 *   2. Prepend a new entry at the TOP of VERSION_LOG below.
 *   3. Keep summaries short. Detail belongs in commit messages / PRs.
 *
 * Versioning:
 *   - major: breaking changes, big architectural shifts
 *   - minor: new feature areas / sections
 *   - patch: small features, fixes, improvements
 */

export type ChangeKind = "feature" | "improvement" | "fix" | "breaking";

export type VersionChange = {
  kind: ChangeKind;
  description: string;
  /** Optional Hebrew translation; if omitted, falls back to `description`. */
  descriptionHe?: string;
};

export type VersionEntry = {
  version: string;
  /** ISO date string (YYYY-MM-DD). */
  date: string;
  type: "major" | "minor" | "patch";
  title: string;
  titleHe?: string;
  changes: VersionChange[];
};

export const CURRENT_VERSION = "1.0.2";

export const VERSION_LOG: VersionEntry[] = [
  {
    version: "1.0.2",
    date: "2026-05-12",
    type: "patch",
    title: "Fix: weekly summary page crashed on load",
    titleHe: "תיקון: עמוד הסיכום השבועי קרס בטעינה",
    changes: [
      {
        kind: "fix",
        description: "Weekly summary page threw a client-side exception because the AI module pulled the OpenAI SDK into the browser bundle. Split types/parser into a server-safe file.",
        descriptionHe: "עמוד הסיכום השבועי קרס מצד הלקוח כי מודול ה-AI גרר את ה-OpenAI SDK ל-bundle של הדפדפן. פוצל קובץ הטיפוסים והפענוח לקובץ נפרד בטוח ללקוח.",
      },
    ],
  },
  {
    version: "1.0.1",
    date: "2026-05-12",
    type: "patch",
    title: "AI-powered weekly summary with bilingual PDF export",
    titleHe: "סיכום שבועי מבוסס AI עם ייצוא PDF דו-לשוני",
    changes: [
      {
        kind: "feature",
        description: "AI weekly summary auto-generated in Hebrew and English on every report.",
        descriptionHe: "סיכום שבועי אוטומטי מבוסס AI בעברית ובאנגלית בכל דוח.",
      },
      {
        kind: "feature",
        description: "Downloadable, print-ready PDF report with full RTL support for Hebrew.",
        descriptionHe: "דוח PDF מעוצב להורדה והדפסה, עם תמיכה מלאה ב-RTL בעברית.",
      },
      {
        kind: "feature",
        description: "Language toggle (HE/EN) on the weekly summary page — entire UI switches.",
        descriptionHe: "מתג שפה (עברית/אנגלית) בעמוד הסיכום השבועי — כל הממשק מתחלף.",
      },
      {
        kind: "feature",
        description: "Report history panel: all past weekly summaries saved and browsable.",
        descriptionHe: "פאנל היסטוריית דוחות: כל הסיכומים השבועיים נשמרים וניתנים לגלישה.",
      },
      {
        kind: "feature",
        description: "Admin-visible version log at /admin/changelog.",
        descriptionHe: "לוג גרסאות גלוי למנהלים בכתובת /admin/changelog.",
      },
    ],
  },
  {
    version: "1.0.0",
    date: "2026-05-12",
    type: "major",
    title: "Initial production release",
    titleHe: "גרסת השקה ראשונה",
    changes: [
      {
        kind: "feature",
        description: "Full CRM: leads, pipeline kanban, tasks, dashboard, reports, AI assistant.",
        descriptionHe: "CRM מלא: לידים, צינור מכירה (Kanban), משימות, dashboard, דוחות, עוזר AI.",
      },
      {
        kind: "feature",
        description: "Internal messaging inbox between users.",
        descriptionHe: "תיבת הודעות פנימית בין משתמשים.",
      },
      {
        kind: "feature",
        description: "AI text & voice commands, lead scoring, insights, weekly summary digest.",
        descriptionHe: "פקודות AI טקסט/קול, ניקוד לידים, תובנות, ותקציר שבועי.",
      },
      {
        kind: "feature",
        description: "Admin back office: users, lead types, pipelines, automation rules, backups, trash.",
        descriptionHe: "ניהול: משתמשים, סוגי לידים, פייפליינים, חוקי אוטומציה, גיבויים וסל המיחזור.",
      },
    ],
  },
];
