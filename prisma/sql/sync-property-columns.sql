-- Sync Property table with prisma/schema.prisma (safe to re-run)
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "discountedPrice" DECIMAL(12,2);
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "region" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "area" TEXT;
ALTER TABLE "Property" ADD COLUMN IF NOT EXISTS "agentUserId" TEXT;
