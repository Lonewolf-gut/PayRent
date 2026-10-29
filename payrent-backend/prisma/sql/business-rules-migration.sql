-- Business rules config + merchant listing fields
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS "BusinessRuleConfig" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "rules" JSONB NOT NULL,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BusinessRuleConfig_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "stockQuantity" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "deliveryTerms" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "warrantyDetails" TEXT;

INSERT INTO "BusinessRuleConfig" ("id", "rules", "updatedAt")
VALUES (
  'default',
  '{
    "agentCommissionPercent": 2.5,
    "platformFinancingFeePercent": 2.5,
    "serviceFeePercent": 1.5,
    "commissionFeePercent": 2.0,
    "processingFeePercent": 0.5,
    "minRepaymentMonths": 6,
    "maxRepaymentMonths": 60,
    "maxInterestRatePercent": 30,
    "lenderFreeFinancingLimit": 100,
    "merchantListingRequiresPaidPlan": true
  }'::jsonb,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;
