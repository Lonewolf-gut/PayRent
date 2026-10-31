ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dashboardTheme" TEXT DEFAULT 'light';

ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "ssnitNumber" TEXT;
ALTER TABLE "Landlord" ADD COLUMN IF NOT EXISTS "ssnitNumber" TEXT;
ALTER TABLE "Lender" ADD COLUMN IF NOT EXISTS "ssnitNumber" TEXT;
ALTER TABLE "AgentProfile" ADD COLUMN IF NOT EXISTS "ssnitNumber" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'KycDocumentType' AND e.enumlabel = 'SSNIT_CARD'
  ) THEN
    ALTER TYPE "KycDocumentType" ADD VALUE 'SSNIT_CARD';
  END IF;
END $$;
