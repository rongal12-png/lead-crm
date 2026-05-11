-- BackupSnapshot: full-DB JSON snapshots taken daily by cron (or manually by admin).
-- Apply with `npx prisma db push`.

CREATE TABLE IF NOT EXISTS "BackupSnapshot" (
  "id"            TEXT PRIMARY KEY,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "triggeredBy"   TEXT NOT NULL DEFAULT 'cron',
  "triggeredById" TEXT,
  "entityCounts"  JSONB NOT NULL,
  "sizeBytes"     INTEGER NOT NULL,
  "data"          JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS "BackupSnapshot_createdAt_idx" ON "BackupSnapshot"("createdAt");
