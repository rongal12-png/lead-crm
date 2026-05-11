-- KaiTerms: editable fundraising-terms document (singleton, looked up by slug).
-- Apply with: `npx prisma db push` (the loose-migration convention used elsewhere in this repo)
-- or run this file directly against the database.

CREATE TABLE IF NOT EXISTS "KaiTerms" (
  "id"          TEXT PRIMARY KEY,
  "slug"        TEXT NOT NULL DEFAULT 'default',
  "title"       TEXT NOT NULL DEFAULT 'סיכום תנאי הגיוס של Kai',
  "content"     TEXT NOT NULL,
  "version"     INTEGER NOT NULL DEFAULT 1,
  "updatedById" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "KaiTerms_slug_key" ON "KaiTerms"("slug");
