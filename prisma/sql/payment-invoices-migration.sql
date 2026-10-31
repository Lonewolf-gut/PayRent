-- Payment invoices for Redde collections (subscriptions, purchases, deposits)

DO $$ BEGIN
  CREATE TYPE "PaymentInvoiceKind" AS ENUM (
    'SUBSCRIPTION',
    'PROPERTY_PURCHASE',
    'PRODUCT_PURCHASE',
    'WALLET_DEPOSIT',
    'PAYOUT'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentInvoiceStatus" AS ENUM (
    'PENDING',
    'PAID',
    'FAILED',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PaymentInvoice" (
  "id" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "kind" "PaymentInvoiceKind" NOT NULL,
  "status" "PaymentInvoiceStatus" NOT NULL DEFAULT 'PENDING',
  "amount" DECIMAL(14, 2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'GHS',
  "userId" TEXT NOT NULL,
  "propertyId" TEXT,
  "beneficiaryUserId" TEXT,
  "subscriptionPlan" "SubscriptionPlan",
  "billingCycle" "BillingCycle",
  "paymentMethod" TEXT,
  "reddeClientReference" TEXT,
  "reddeClientTransId" TEXT,
  "reddeTransactionId" TEXT,
  "provider" TEXT NOT NULL DEFAULT 'redde',
  "description" TEXT,
  "paidAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentInvoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentInvoice_invoiceNumber_key" ON "PaymentInvoice"("invoiceNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentInvoice_reddeClientReference_key" ON "PaymentInvoice"("reddeClientReference");
CREATE INDEX IF NOT EXISTS "PaymentInvoice_userId_idx" ON "PaymentInvoice"("userId");
CREATE INDEX IF NOT EXISTS "PaymentInvoice_kind_status_idx" ON "PaymentInvoice"("kind", "status");
CREATE INDEX IF NOT EXISTS "PaymentInvoice_propertyId_idx" ON "PaymentInvoice"("propertyId");

DO $$ BEGIN
  ALTER TABLE "PaymentInvoice"
    ADD CONSTRAINT "PaymentInvoice_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PaymentInvoice"
    ADD CONSTRAINT "PaymentInvoice_propertyId_fkey"
    FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
