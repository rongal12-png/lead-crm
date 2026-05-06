-- One-shot reset script.
-- Wipes all users and leads (and everything that references them: activities,
-- tasks, AI insights, sessions, audit logs, etc), collapses the UserRole enum
-- to {ADMIN, USER}, and seeds a fresh admin account.
--
-- Configuration tables (Pipeline, Stage, LeadType, CustomFieldDefinition,
-- AutomationRule) are NOT touched.
--
-- Login after running:
--   email:    admin@crm.com
--   password: Admin1234!
--   ⚠ Change the password from /admin → Users → edit, OR delete this user
--   and create your own from the UI immediately after first login.
--
-- Run this once on Neon (SQL Editor). Wrapped in a transaction; nothing is
-- committed if any step fails.

BEGIN;

-- 1. Wipe demo data. CASCADE walks every FK pointing to User or Lead, so all
--    activities, tasks, notifications, audit logs, sessions, etc. go too.
TRUNCATE TABLE
  "User",
  "Lead",
  "Account",
  "Session",
  "VerificationToken"
CASCADE;

-- 2. Collapse the UserRole enum.
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "UserRole" USING 'USER'::"UserRole";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';

DROP TYPE "UserRole_old";

-- 3. Seed a fresh admin (bcrypt hash of "Admin1234!", 12 rounds).
INSERT INTO "User" (
  id, name, email, password, role, status, language, timezone, "createdAt", "updatedAt"
) VALUES (
  'admin-seed-001',
  'System Admin',
  'admin@crm.com',
  '$2a$12$lmEeYNUw3UrMh8slnqoO5O2uB6bQyccTzLx8xr27uU.WQl0wbmUUy',
  'ADMIN',
  'active',
  'en',
  'UTC',
  NOW(),
  NOW()
);

COMMIT;
