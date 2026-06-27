DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'UserStatus'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED', 'PENDING');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'TeamStatus'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "TeamStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'BillingCycle'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'LicenseStatus'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "LicenseStatus" AS ENUM ('TRIAL', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'LicensePaymentStatus'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "LicensePaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'EodMode'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "EodMode" AS ENUM ('AUTO', 'MANUAL');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'EodStatus'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE "EodStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');
  END IF;
END $$;

ALTER TYPE "SystemRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
ALTER TYPE "SystemRole" ADD VALUE IF NOT EXISTS 'TREASURER';

ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'OVERDUE';
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

ALTER TABLE "ContributionPayment" DROP CONSTRAINT IF EXISTS "ContributionPayment_approvedBy_fkey";
ALTER TABLE "ContributionPayment" RENAME COLUMN "approvedBy" TO "approvedById";
ALTER TABLE "ContributionPayment"
  ADD COLUMN IF NOT EXISTS "rejectedById" UUID,
  ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3);

ALTER TABLE "ContributionPayment"
  ADD CONSTRAINT "ContributionPayment_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ContributionPayment"
  ADD CONSTRAINT "ContributionPayment_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Team"
  ADD COLUMN IF NOT EXISTS "status" "TeamStatus" NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE "NationalHoliday"
  ALTER COLUMN "updatedAt" DROP DEFAULT;

CREATE TABLE IF NOT EXISTS "Plan" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "maxTeams" INTEGER NOT NULL DEFAULT 1,
    "maxMembers" INTEGER NOT NULL DEFAULT 10,
    "allowReminder" BOOLEAN NOT NULL DEFAULT true,
    "allowExport" BOOLEAN NOT NULL DEFAULT true,
    "allowAuditLog" BOOLEAN NOT NULL DEFAULT true,
    "allowCustomBranding" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Plan_code_key" ON "Plan"("code");

CREATE TABLE IF NOT EXISTS "OwnerLicense" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "status" "LicenseStatus" NOT NULL DEFAULT 'TRIAL',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "trialEndsAt" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnerLicense_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OwnerLicense_ownerId_key" ON "OwnerLicense"("ownerId");
CREATE INDEX IF NOT EXISTS "OwnerLicense_planId_status_idx" ON "OwnerLicense"("planId", "status");
CREATE INDEX IF NOT EXISTS "OwnerLicense_status_endDate_idx" ON "OwnerLicense"("status", "endDate");

ALTER TABLE "OwnerLicense"
  ADD CONSTRAINT "OwnerLicense_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OwnerLicense"
  ADD CONSTRAINT "OwnerLicense_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "LicensePayment" (
    "id" UUID NOT NULL,
    "licenseId" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" "LicensePaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proofUrl" TEXT,
    "approvedById" UUID,
    "approvedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LicensePayment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LicensePayment_licenseId_status_idx" ON "LicensePayment"("licenseId", "status");
CREATE INDEX IF NOT EXISTS "LicensePayment_ownerId_status_idx" ON "LicensePayment"("ownerId", "status");

ALTER TABLE "LicensePayment"
  ADD CONSTRAINT "LicensePayment_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "OwnerLicense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LicensePayment"
  ADD CONSTRAINT "LicensePayment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LicensePayment"
  ADD CONSTRAINT "LicensePayment_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "teamId" UUID,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "targetId" UUID,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_teamId_createdAt_idx" ON "AuditLog"("teamId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_module_createdAt_idx" ON "AuditLog"("module", "createdAt");

ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AuditLog"
  ADD CONSTRAINT "AuditLog_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "EodRun" (
    "id" UUID NOT NULL,
    "runDate" DATE NOT NULL,
    "mode" "EodMode" NOT NULL,
    "status" "EodStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),
    "triggeredById" UUID,
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EodRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EodRun_runDate_mode_idx" ON "EodRun"("runDate", "mode");
CREATE INDEX IF NOT EXISTS "EodRun_status_createdAt_idx" ON "EodRun"("status", "createdAt");

ALTER TABLE "EodRun"
  ADD CONSTRAINT "EodRun_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
