# Lead CRM — AI-Powered Sales Management

מערכת CRM מתקדמת לניהול לידים ומכירות עם AI ופקודות קוליות.

## Stack טכנולוגי
- **Frontend/Backend**: Next.js 14 (App Router) + TypeScript
- **Database**: PostgreSQL (Neon recommended)
- **ORM**: Prisma
- **Auth**: NextAuth.js
- **AI**: OpenAI GPT-4o + Whisper
- **UI**: Tailwind CSS

---

## הרצה מקומית

### 1. Clone המאגר
```bash
git clone https://github.com/YOUR_USERNAME/lead-crm.git
cd lead-crm
```

### 2. Install dependencies
```bash
npm install
```

### 3. הגדרת משתני סביבה
```bash
cp .env.example .env
```
ערוך `.env` עם ה-credentials שלך.

### 4. יצירת Database (Neon)
1. צור חשבון ב-[neon.tech](https://neon.tech)
2. צור database חדש
3. העתק את connection string ל-`DATABASE_URL` ב-.env

### 5. יצירת OpenAI API Key
1. גש ל-[platform.openai.com](https://platform.openai.com)
2. צור API key
3. הוסף ל-`OPENAI_API_KEY` ב-.env

### 6. Push schema למסד הנתונים
```bash
npm run db:push
```

### 7. Seed data (משתמשי demo + pipelines)
```bash
npm run db:seed
```

### 8. הפעל
```bash
npm run dev
```
גש ל-http://localhost:3000

---

## הרצה מהירה — Deploy לVercel

### 1. Push לGitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/lead-crm.git
git push -u origin main
```

### 2. Connect לVercel
1. גש ל-[vercel.com](https://vercel.com)
2. "Import Project" → בחר את ה-repo מ-GitHub
3. הוסף את משתני הסביבה הבאים:

```
DATABASE_URL=postgresql://...
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-secret-min-32-chars
OPENAI_API_KEY=sk-...
```

4. לחץ Deploy

### 3. הרץ Seed אחרי Deploy
בVercel dashboard → Deployments → Functions → הרץ:
```bash
npx prisma db push && npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
```

---

## משתמשי Demo

| Email | Password | Role |
|-------|----------|------|
| admin@crm.com | Admin1234! | Admin |
| manager@crm.com | Admin1234! | Manager |
| agent@crm.com | Admin1234! | Sales Agent |

---

## תכונות MVP

- ✅ Login + Role-based permissions (Admin, Manager, Agent, Viewer)
- ✅ ניהול לידים — VC, Leader, Connector
- ✅ Pipeline Kanban עם drag & drop
- ✅ Lead Detail Page עם timeline מלא
- ✅ Tasks & Follow-ups עם תזכורות
- ✅ Dashboard עם KPIs
- ✅ AI Voice Commands (עברית + אנגלית)
- ✅ AI Text Commands
- ✅ AI Summary לכל ליד
- ✅ AI Insights (אינאקטיביות, לידים חמים, Pipeline תקוע)
- ✅ AI Intent Recognition עם JSON structured output
- ✅ Confirmation flow לפעולות רגישות
- ✅ Audit Log לכל פעולה
- ✅ Custom Fields per Lead Type
- ✅ Automation Rules (stage triggers)
- ✅ Reports & Analytics
- ✅ Admin Panel — Users, Pipelines, Lead Types

---

## מבנה הפרויקט

```
src/
├── app/
│   ├── (auth)/login/         # Login page
│   ├── (dashboard)/
│   │   ├── dashboard/        # Main dashboard
│   │   ├── leads/            # Lead list + detail + new
│   │   ├── pipeline/         # Kanban view
│   │   ├── tasks/            # Task management
│   │   ├── reports/          # Analytics
│   │   ├── ai/               # AI assistant
│   │   └── admin/            # Admin settings
│   └── api/                  # API routes
├── components/               # React components
├── lib/
│   ├── auth.ts               # NextAuth config
│   ├── openai.ts             # OpenAI client
│   ├── prisma.ts             # Prisma client
│   └── ai/                   # AI modules
│       ├── intent.ts         # Intent recognition
│       ├── actions.ts        # Action execution
│       ├── insights.ts       # AI insights + scoring
└── types/                    # TypeScript types
```
