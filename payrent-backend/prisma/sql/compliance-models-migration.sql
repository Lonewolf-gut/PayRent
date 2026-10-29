-- Compliance models: DataConsent + FeeDisclosureRecord
-- Safe to run multiple times (IF NOT EXISTS guards).

DO $$ BEGIN
  CREATE TYPE "ConsentType" AS ENUM (
    'DATA_COLLECTION_PROCESSING',
    'TERMS_OF_SERVICE',
    'FINANCING_DATA_PROCESSING'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "DataConsent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "consentType" "ConsentType" NOT NULL,
  "version" TEXT NOT NULL DEFAULT '1.0',
  "granted" BOOLEAN NOT NULL DEFAULT true,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "metadata" JSONB,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "DataConsent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DataConsent_userId_idx" ON "DataConsent"("userId");
CREATE INDEX IF NOT EXISTS "DataConsent_consentType_idx" ON "DataConsent"("consentType");
CREATE INDEX IF NOT EXISTS "DataConsent_grantedAt_idx" ON "DataConsent"("grantedAt");

DO $$ BEGIN
  ALTER TABLE "DataConsent"
    ADD CONSTRAINT "DataConsent_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "FeeDisclosureRecord" (
  "id" TEXT NOT NULL,
  "financingRequestId" TEXT NOT NULL,
  "tenantUserId" TEXT NOT NULL,
  "lenderUserId" TEXT NOT NULL,
  "principalAmount" DECIMAL(14,2) NOT NULL,
  "interestRate" DECIMAL(5,2) NOT NULL,
  "totalRepayable" DECIMAL(14,2) NOT NULL,
  "platformFee" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "agentCommission" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "durationMonths" INTEGER NOT NULL,
  "monthlyPayment" DECIMAL(14,2) NOT NULL,
  "disclosureVersion" TEXT NOT NULL DEFAULT '1.0',
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedByUserId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FeeDisclosureRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FeeDisclosureRecord_financingRequestId_key"
  ON "FeeDisclosureRecord"("financingRequestId");
CREATE INDEX IF NOT EXISTS "FeeDisclosureRecord_tenantUserId_idx" ON "FeeDisclosureRecord"("tenantUserId");
CREATE INDEX IF NOT EXISTS "FeeDisclosureRecord_lenderUserId_idx" ON "FeeDisclosureRecord"("lenderUserId");
CREATE INDEX IF NOT EXISTS "FeeDisclosureRecord_acceptedAt_idx" ON "FeeDisclosureRecord"("acceptedAt");

DO $$ BEGIN
  ALTER TABLE "FeeDisclosureRecord"
    ADD CONSTRAINT "FeeDisclosureRecord_financingRequestId_fkey"
    FOREIGN KEY ("financingRequestId") REFERENCES "FinancingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "FeeDisclosureRecord"
    ADD CONSTRAINT "FeeDisclosureRecord_tenantUserId_fkey"
    FOREIGN KEY ("tenantUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "FeeDisclosureRecord"
    ADD CONSTRAINT "FeeDisclosureRecord_lenderUserId_fkey"
    FOREIGN KEY ("lenderUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
