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

export const CURRENT_VERSION = "1.0.7";

export const VERSION_LOG: VersionEntry[] = [
  {
    version: "1.0.7",
    date: "2026-05-13",
    type: "patch",
    title: "Pipeline renamed Purchaser → Connector",
    titleHe: "פייפליין שונה מ-Purchaser ל-Connector",
    changes: [
      {
        kind: "improvement",
        description: "\"Purchaser Pipeline\" renamed to \"Connector Pipeline\" everywhere — pipeline name, description, seed variable names, and README. The same renamed pipeline keeps all existing stages and leads.",
        descriptionHe: "\"Purchaser Pipeline\" שונה ל-\"Connector Pipeline\" בכל המקומות — שם הפייפליין, התיאור, שמות משתנים ב-seed וב-README. אותו פייפליין נשאר עם כל השלבים והלידים הקיימים.",
      },
    ],
  },
  {
    version: "1.0.6",
    date: "2026-05-13",
    type: "patch",
    title: "Sidebar scrolls inside its own viewport on short screens",
    titleHe: "סיידבר נגלל בתוך עצמו במסכים קצרים",
    changes: [
      {
        kind: "fix",
        description: "Sidebar height switched from min-h-screen to h-screen so the nav list scrolls inside the sidebar instead of pushing the user menu off-screen on short viewports.",
        descriptionHe: "גובה הסיידבר שונה מ-min-h-screen ל-h-screen, כך שהתפריט נגלל בתוך הסיידבר במקום לדחוף את אזור המשתמש מחוץ למסך במסכים נמוכים.",
      },
    ],
  },
  {
    version: "1.0.5",
    date: "2026-05-13",
    type: "patch",
    title: "Lead types: VC / Leader / Connector + unified calls & meetings",
    titleHe: "סוגי לידים: VC / Leader / Connector + איחוד שיחות ופגישות",
    changes: [
      {
        kind: "breaking",
        description: "Lead type \"Purchaser\" renamed to \"Connector\". Existing leads under this type are migrated automatically.",
        descriptionHe: "סוג הליד \"Purchaser\" שונה ל-\"Connector\". לידים קיימים מועברים אוטומטית.",
      },
      {
        kind: "improvement",
        description: "\"Calls\" and \"Meetings\" merged into a single activity/task type. Existing MEETING records are converted to CALL.",
        descriptionHe: "\"שיחות\" ו-\"פגישות\" אוחדו לסוג פעילות/משימה אחד. רישומי פגישה קיימים הומרו לשיחה.",
      },
      {
        kind: "improvement",
        description: "Weekly report now shows a single \"Calls\" tile (sum of former calls + meetings) instead of two separate tiles.",
        descriptionHe: "הדוח השבועי מציג כעת אריח אחד \"שיחות\" (סכום שיחות + פגישות לשעבר) במקום שני אריחים נפרדים.",
      },
    ],
  },
  {
    version: "1.0.4",
    date: "2026-05-12",
    type: "patch",
    title: "Less sycophantic AI tone + current-week reports + fresh data on regenerate",
    titleHe: "AI פחות לקקני + דוח לשבוע הנוכחי + נתונים טריים בחידוש",
    changes: [
      {
        kind: "improvement",
        description: "AI prompt rewritten again: factual and direct, banned filler phrases like \"built momentum\" or \"laid the foundation\". Describes what actually happened, never invents data.",
        descriptionHe: "פרומפט ה-AI נכתב מחדש: ענייני וישיר, אסורים ביטויי פילר כמו \"צברנו מומנטום\" או \"הנחנו את התשתית\". מתאר מה קרה בפועל ולא ממציא נתונים.",
      },
      {
        kind: "fix",
        description: "Regenerate-AI used stale DB data — newly created/completed tasks were invisible to the model. Now recomputes fresh data from the DB before regenerating the narrative.",
        descriptionHe: "כפתור \"חידוש סיכום AI\" השתמש בנתונים ישנים — משימות שנוצרו/הושלמו לאחרונה לא היו זמינות למודל. כעת מחושב מחדש מה-DB לפני יצירת הסיכום.",
      },
      {
        kind: "feature",
        description: "New \"Generate (this week so far)\" button generates a report for the current in-progress week, not only the last completed week.",
        descriptionHe: "כפתור חדש \"צור דוח (השבוע, עד עכשיו)\" יוצר דוח לשבוע הנוכחי בעיצומו, לא רק לשבוע הקודם המלא.",
      },
    ],
  },
  {
    version: "1.0.3",
    date: "2026-05-12",
    type: "patch",
    title: "Manager-friendly weekly report tone + delete reports",
    titleHe: "טון דוח שבועי מתאים לממונה + מחיקת דוחות",
    changes: [
      {
        kind: "improvement",
        description: "AI weekly summary prompt rewritten: positive, constructive tone framed for presentation to management — no \"quiet week\" or \"slow week\" phrasing, never invents data.",
        descriptionHe: "פרומפט סיכום ה-AI נכתב מחדש: טון חיובי וקונסטרוקטיבי המתאים להצגה להנהלה — בלי ניסוחים כמו \"שבוע שקט\" או \"שבוע איטי\", ובלי המצאת נתונים.",
      },
      {
        kind: "improvement",
        description: "Removed the static \"Quiet week\" banner from both the dashboard view and the printable PDF.",
        descriptionHe: "הוסר הבאנר הסטטי \"שבוע שקט\" מהמסך וגם מה-PDF להדפסה.",
      },
      {
        kind: "feature",
        description: "Admins can now delete weekly reports from the history panel (with confirmation).",
        descriptionHe: "מנהלים יכולים למחוק דוחות שבועיים מפאנל ההיסטוריה (עם אישור).",
      },
    ],
  },
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
