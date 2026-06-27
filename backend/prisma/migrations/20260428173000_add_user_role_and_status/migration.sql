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

ALTER TYPE "SystemRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
ALTER TYPE "SystemRole" ADD VALUE IF NOT EXISTS 'TREASURER';

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "role" "SystemRole" NOT NULL DEFAULT 'MEMBER',
  ADD COLUMN IF NOT EXISTS "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

UPDATE "User"
SET "role" = 'MEMBER'
WHERE "role" IS NULL;

UPDATE "User"
SET "status" = 'ACTIVE'
WHERE "status" IS NULL;

ALTER TABLE "User"
  ALTER COLUMN "role" SET DEFAULT 'MEMBER',
  ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
