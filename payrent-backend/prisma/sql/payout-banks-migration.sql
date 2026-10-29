CREATE TABLE IF NOT EXISTS "PayoutBankConfig" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "paystackCode" TEXT NOT NULL,
  "resolveCode" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PayoutBankConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PayoutBankConfig_paystackCode_key"
  ON "PayoutBankConfig"("paystackCode");

CREATE INDEX IF NOT EXISTS "PayoutBankConfig_isActive_sortOrder_idx"
  ON "PayoutBankConfig"("isActive", "sortOrder");
