-- Financing workflow: eligibility, admin review, buyer acceptance, delivery, reminders

DO $$ BEGIN
  CREATE TYPE "FinancingRiskCategory" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'INELIGIBLE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "FinancingDeliveryStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'DELIVERED', 'CONFIRMED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "AdminReviewType" ADD VALUE IF NOT EXISTS 'FINANCING_REQUEST';

ALTER TABLE "FinancingRequest"
  ADD COLUMN IF NOT EXISTS "riskCategory" "FinancingRiskCategory",
  ADD COLUMN IF NOT EXISTS "eligibilityScore" INTEGER,
  ADD COLUMN IF NOT EXISTS "repaymentPreference" JSONB,
  ADD COLUMN IF NOT EXISTS "affordabilitySnapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "offeredInterestRate" DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS "offeredPlanType" "RepaymentPlanType",
  ADD COLUMN IF NOT EXISTS "adminReviewedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "adminReviewedByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "buyerAcceptedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deliveryStatus" "FinancingDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);

ALTER TABLE "Installment"
  ADD COLUMN IF NOT EXISTS "lastReminderAt" TIMESTAMP(3);
