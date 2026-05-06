-- One-time migration: collapse UserRole enum from {ADMIN, MANAGER, AGENT, VIEWER} to {ADMIN, USER}.
-- MANAGER → ADMIN  (managers had admin-equivalent access in code)
-- AGENT  → USER
-- VIEWER → USER
--
-- Run this on the Neon database (SQL editor or psql) BEFORE deploying the new code.
-- It is wrapped in a transaction; nothing is committed if any step fails.

BEGIN;

-- Step 1: rename old enum so we can create the new one with the same name.
ALTER TYPE "UserRole" RENAME TO "UserRole_old";

-- Step 2: create the new enum.
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- Step 3: rewrite the column. Drop default first; convert via CASE; restore default.
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "UserRole" USING (
    CASE "role"::text
      WHEN 'ADMIN'   THEN 'ADMIN'::"UserRole"
      WHEN 'MANAGER' THEN 'ADMIN'::"UserRole"
      WHEN 'AGENT'   THEN 'USER'::"UserRole"
      WHEN 'VIEWER'  THEN 'USER'::"UserRole"
      ELSE 'USER'::"UserRole"
    END
  );

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';

-- Step 4: drop the old enum.
DROP TYPE "UserRole_old";

COMMIT;
