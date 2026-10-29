-- Partner bank API tables and withdrawal extensions
-- Usage: npm run db:bank-partner

DO $$ BEGIN
  CREATE TYPE "BankPartnerTransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'CHARGE', 'MANDATE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "BankPartnerDirection" AS ENUM ('INBOUND', 'OUTBOUND');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PlatformSettlementAccount" (
  "id" TEXT NOT NULL,
  "bankName" TEXT NOT NULL,
  "bankCode" TEXT NOT NULL,
  "accountNumber" TEXT NOT NULL,
  "accountName" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "partnerBankId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformSettlementAccount_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PlatformSettlementAccount_isDefault_isActive_idx"
  ON "PlatformSettlementAccount"("isDefault", "isActive");

CREATE TABLE IF NOT EXISTS "BankPartnerTransaction" (
  "id" TEXT NOT NULL,
  "direction" "BankPartnerDirection" NOT NULL DEFAULT 'INBOUND',
  "type" "BankPartnerTransactionType" NOT NULL,
  "platformReference" TEXT NOT NULL,
  "partnerReference" TEXT,
  "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
  "amount" DECIMAL(14,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'GHS',
  "userId" TEXT,
  "bankAccountId" TEXT,
  "withdrawalRequestId" TEXT,
  "installmentId" TEXT,
  "mandateId" TEXT,
  "walletTransactionId" TEXT,
  "failureCode" TEXT,
  "failureMessage" TEXT,
  "metadata" JSONB,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BankPartnerTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BankPartnerTransaction_platformReference_key"
  ON "BankPartnerTransaction"("platformReference");
CREATE UNIQUE INDEX IF NOT EXISTS "BankPartnerTransaction_partnerReference_key"
  ON "BankPartnerTransaction"("partnerReference");
CREATE INDEX IF NOT EXISTS "BankPartnerTransaction_userId_idx" ON "BankPartnerTransaction"("userId");
CREATE INDEX IF NOT EXISTS "BankPartnerTransaction_status_idx" ON "BankPartnerTransaction"("status");
CREATE INDEX IF NOT EXISTS "BankPartnerTransaction_type_status_idx" ON "BankPartnerTransaction"("type", "status");
CREATE INDEX IF NOT EXISTS "BankPartnerTransaction_withdrawalRequestId_idx" ON "BankPartnerTransaction"("withdrawalRequestId");
CREATE INDEX IF NOT EXISTS "BankPartnerTransaction_installmentId_idx" ON "BankPartnerTransaction"("installmentId");

DO $$ BEGIN
  ALTER TABLE "BankPartnerTransaction"
    ADD CONSTRAINT "BankPartnerTransaction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "BankPartnerTransaction"
    ADD CONSTRAINT "BankPartnerTransaction_withdrawalRequestId_fkey"
    FOREIGN KEY ("withdrawalRequestId") REFERENCES "WithdrawalRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "WithdrawalRequest" ADD COLUMN IF NOT EXISTS "partnerReference" TEXT;
ALTER TABLE "WithdrawalRequest" ADD COLUMN IF NOT EXISTS "walletTransactionId" TEXT;
ALTER TABLE "WithdrawalRequest" ADD COLUMN IF NOT EXISTS "failureReason" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "WithdrawalRequest_partnerReference_key"
  ON "WithdrawalRequest"("partnerReference");
CREATE INDEX IF NOT EXISTS "WithdrawalRequest_partnerReference_idx"
  ON "WithdrawalRequest"("partnerReference");
