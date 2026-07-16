-- =============================================================================
-- Planner module migration (ADDITIVE ONLY — no drops, safe to run on the live DB)
-- Apply with: npx prisma db execute --file prisma/manual-migrations/0001_planner.sql
-- Then: mirror these in schema.prisma and run `npx prisma generate`.
--
-- Why raw SQL instead of `prisma migrate` / `db push`:
-- the live Neon DB has drifted from schema.prisma (it has billing/admin columns
-- not in the schema file), so prisma's diff-based tools would try to DROP that
-- data. This script only CREATEs new objects and ADDs one nullable column.
-- =============================================================================

-- ---------- Enums ----------
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='LeadStatus') THEN
  CREATE TYPE "LeadStatus" AS ENUM ('NEW','CONTACTED','CONVERTED','LOST'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='MeetingStatus') THEN
  CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED','COMPLETED','CANCELLED','NO_SHOW'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='TranscriptStatus') THEN
  CREATE TYPE "TranscriptStatus" AS ENUM ('PENDING','AVAILABLE','UNAVAILABLE','MANUAL'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='PlannerEventType') THEN
  CREATE TYPE "PlannerEventType" AS ENUM ('TASK','MILESTONE','MEETING'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='PlannerEventVisibility') THEN
  CREATE TYPE "PlannerEventVisibility" AS ENUM ('INTERNAL','CLIENT_VISIBLE'); END IF; END $$;

-- ---------- Project.slug (booking URL /book/[slug]) ----------
-- Added nullable first; app backfills existing rows, then a UNIQUE index is added.
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "slug" TEXT;

-- ---------- OrganizationSettings (one row per organization) ----------
CREATE TABLE IF NOT EXISTS "OrganizationSettings" (
  "id"                         TEXT NOT NULL,
  "organizationId"             TEXT NOT NULL,
  "workingDays"                INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}',   -- 0=Sun..6=Sat
  "workingHoursStart"          INTEGER NOT NULL DEFAULT 600,               -- minutes from midnight (10:00)
  "workingHoursEnd"            INTEGER NOT NULL DEFAULT 1020,              -- 17:00
  "timezone"                   TEXT NOT NULL DEFAULT 'UTC',
  "slotDurationMinutes"        INTEGER NOT NULL DEFAULT 30,
  "blockedDates"               TIMESTAMP(3)[] NOT NULL DEFAULT '{}',
  "defaultIntroCallAttendeeId" TEXT,                                       -- -> User (intro-call host)
  "googleRefreshToken"         TEXT,                                       -- per-org Google OAuth token
  "googleConnectedEmail"       TEXT,
  "createdAt"                  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrganizationSettings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationSettings_organizationId_key" ON "OrganizationSettings"("organizationId");

-- ---------- Lead (prospective clients from /book, before conversion) ----------
CREATE TABLE IF NOT EXISTS "Lead" (
  "id"                 TEXT NOT NULL,
  "organizationId"     TEXT NOT NULL,
  "name"               TEXT NOT NULL,
  "email"              TEXT NOT NULL,
  "company"            TEXT,
  "note"               TEXT,
  "status"             "LeadStatus" NOT NULL DEFAULT 'NEW',
  "convertedUserId"    TEXT,   -- -> User once converted to a real client
  "convertedProjectId" TEXT,   -- -> Project created from this lead
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Lead_organizationId_idx" ON "Lead"("organizationId");
CREATE INDEX IF NOT EXISTS "Lead_email_idx" ON "Lead"("email");

-- ---------- Meeting ----------
CREATE TABLE IF NOT EXISTS "Meeting" (
  "id"             TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "projectId"      TEXT,          -- null for lead/intro calls
  "pmId"           TEXT NOT NULL, -- attendee (project PM, or default intro-call host)
  "clientId"       TEXT,          -- -> User (role CLIENT), null until matched
  "leadId"         TEXT,          -- -> Lead, for intro calls
  "leadName"       TEXT,
  "leadEmail"      TEXT,
  "leadCompany"    TEXT,
  "leadNote"       TEXT,
  "startTime"      TIMESTAMP(3) NOT NULL,
  "endTime"        TIMESTAMP(3) NOT NULL,
  "status"         "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
  "meetLink"       TEXT,
  "googleEventId"  TEXT,
  "reminderSentAt" TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Meeting_organizationId_idx" ON "Meeting"("organizationId");
CREATE INDEX IF NOT EXISTS "Meeting_projectId_idx" ON "Meeting"("projectId");
CREATE INDEX IF NOT EXISTS "Meeting_pmId_idx" ON "Meeting"("pmId");
CREATE INDEX IF NOT EXISTS "Meeting_clientId_idx" ON "Meeting"("clientId");
CREATE INDEX IF NOT EXISTS "Meeting_startTime_idx" ON "Meeting"("startTime");

-- ---------- MeetingNote (AI analysis output, 1:1 with Meeting) ----------
CREATE TABLE IF NOT EXISTS "MeetingNote" (
  "id"               TEXT NOT NULL,
  "meetingId"        TEXT NOT NULL,
  "summary"          TEXT,
  "keyPoints"        JSONB,
  "actionItems"      JSONB,
  "notes"            TEXT,
  "transcriptStatus" "TranscriptStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MeetingNote_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MeetingNote_meetingId_key" ON "MeetingNote"("meetingId");

-- ---------- PlannerEvent (org events / milestones) ----------
CREATE TABLE IF NOT EXISTS "PlannerEvent" (
  "id"             TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "projectId"      TEXT,
  "title"          TEXT NOT NULL,
  "type"           "PlannerEventType" NOT NULL DEFAULT 'MILESTONE',
  "startDate"      TIMESTAMP(3) NOT NULL,
  "endDate"        TIMESTAMP(3),
  "assignedToId"   TEXT,
  "visibility"     "PlannerEventVisibility" NOT NULL DEFAULT 'INTERNAL',
  "status"         TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlannerEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PlannerEvent_organizationId_idx" ON "PlannerEvent"("organizationId");
CREATE INDEX IF NOT EXISTS "PlannerEvent_projectId_idx" ON "PlannerEvent"("projectId");

-- ---------- Foreign keys (guarded so re-runs are safe) ----------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='OrganizationSettings_organizationId_fkey') THEN
    ALTER TABLE "OrganizationSettings" ADD CONSTRAINT "OrganizationSettings_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='OrganizationSettings_defaultIntroCallAttendeeId_fkey') THEN
    ALTER TABLE "OrganizationSettings" ADD CONSTRAINT "OrganizationSettings_defaultIntroCallAttendeeId_fkey"
      FOREIGN KEY ("defaultIntroCallAttendeeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Lead_organizationId_fkey') THEN
    ALTER TABLE "Lead" ADD CONSTRAINT "Lead_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Lead_convertedUserId_fkey') THEN
    ALTER TABLE "Lead" ADD CONSTRAINT "Lead_convertedUserId_fkey"
      FOREIGN KEY ("convertedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Lead_convertedProjectId_fkey') THEN
    ALTER TABLE "Lead" ADD CONSTRAINT "Lead_convertedProjectId_fkey"
      FOREIGN KEY ("convertedProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Meeting_organizationId_fkey') THEN
    ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Meeting_projectId_fkey') THEN
    ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Meeting_pmId_fkey') THEN
    ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_pmId_fkey"
      FOREIGN KEY ("pmId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Meeting_clientId_fkey') THEN
    ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='Meeting_leadId_fkey') THEN
    ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_leadId_fkey"
      FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='MeetingNote_meetingId_fkey') THEN
    ALTER TABLE "MeetingNote" ADD CONSTRAINT "MeetingNote_meetingId_fkey"
      FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='PlannerEvent_organizationId_fkey') THEN
    ALTER TABLE "PlannerEvent" ADD CONSTRAINT "PlannerEvent_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='PlannerEvent_projectId_fkey') THEN
    ALTER TABLE "PlannerEvent" ADD CONSTRAINT "PlannerEvent_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='PlannerEvent_assignedToId_fkey') THEN
    ALTER TABLE "PlannerEvent" ADD CONSTRAINT "PlannerEvent_assignedToId_fkey"
      FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF;
END $$;

-- NOTE: "Project_slug_key" UNIQUE index is added by a follow-up step AFTER the
-- app backfills slugs for existing projects (adding it now would allow only one
-- NULL... actually multiple NULLs are allowed, but we still backfill first so
-- existing projects get real slugs before uniqueness is enforced).
