-- Migrate legacy FinancingRequestDocument (per financing request)
-- into TenantFinancingDocument (per tenant).
--
-- Run in Supabase → SQL Editor BEFORE `npx prisma db push --accept-data-loss`.
-- Keeps all file metadata; archives the old table instead of losing rows.

-- 1) Ensure target table exists (safe if db push already created it)
CREATE TABLE IF NOT EXISTS "TenantFinancingDocument" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "documentType" "TenantFinancingDocType" NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "status" "FinancingDocReviewStatus" NOT NULL DEFAULT 'PENDING',
  "reviewNotes" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TenantFinancingDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TenantFinancingDocument_tenantId_documentType_key"
  ON "TenantFinancingDocument"("tenantId", "documentType");
CREATE INDEX IF NOT EXISTS "TenantFinancingDocument_tenantId_idx"
  ON "TenantFinancingDocument"("tenantId");
CREATE INDEX IF NOT EXISTS "TenantFinancingDocument_status_idx"
  ON "TenantFinancingDocument"("status");

DO $$ BEGIN
  ALTER TABLE "TenantFinancingDocument"
    ADD CONSTRAINT "TenantFinancingDocument_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2) Copy rows (one row per tenant + documentType; prefer APPROVED, then newest)
INSERT INTO "TenantFinancingDocument" (
  "id",
  "tenantId",
  "documentType",
  "fileName",
  "fileUrl",
  "status",
  "reviewNotes",
  "reviewedAt",
  "reviewedBy",
  "createdAt",
  "updatedAt"
)
SELECT
  picked."id",
  picked."tenantId",
  picked."documentType",
  picked."fileName",
  picked."fileUrl",
  picked."status",
  picked."reviewNotes",
  picked."reviewedAt",
  picked."reviewedBy",
  picked."createdAt",
  picked."updatedAt"
FROM (
  SELECT DISTINCT ON (fr."tenantId", frd."documentType")
    frd."id",
    fr."tenantId",
    frd."documentType",
    frd."fileName",
    frd."fileUrl",
    frd."status",
    frd."reviewNotes",
    frd."reviewedAt",
    frd."reviewedBy",
    frd."createdAt",
    frd."updatedAt"
  FROM "FinancingRequestDocument" frd
  INNER JOIN "FinancingRequest" fr ON fr."id" = frd."financingRequestId"
  ORDER BY
    fr."tenantId",
    frd."documentType",
    CASE frd."status"
      WHEN 'APPROVED' THEN 0
      WHEN 'PENDING' THEN 1
      WHEN 'REJECTED' THEN 2
      ELSE 3
    END,
    frd."updatedAt" DESC
) AS picked
ON CONFLICT ("tenantId", "documentType") DO UPDATE SET
  "fileName" = EXCLUDED."fileName",
  "fileUrl" = EXCLUDED."fileUrl",
  "status" = EXCLUDED."status",
  "reviewNotes" = EXCLUDED."reviewNotes",
  "reviewedAt" = EXCLUDED."reviewedAt",
  "reviewedBy" = EXCLUDED."reviewedBy",
  "updatedAt" = EXCLUDED."updatedAt"
WHERE
  CASE EXCLUDED."status"
    WHEN 'APPROVED' THEN 0
    WHEN 'PENDING' THEN 1
    WHEN 'REJECTED' THEN 2
    ELSE 3
  END <= CASE "TenantFinancingDocument"."status"
    WHEN 'APPROVED' THEN 0
    WHEN 'PENDING' THEN 1
    WHEN 'REJECTED' THEN 2
    ELSE 3
  END
  OR "TenantFinancingDocument"."updatedAt" < EXCLUDED."updatedAt";

-- 3) Archive legacy table (Prisma will stop trying to drop your 23 rows)
DO $$ BEGIN
  IF to_regclass('public."FinancingRequestDocument"') IS NOT NULL
     AND to_regclass('public."FinancingRequestDocument_archive"') IS NULL THEN
    ALTER TABLE "FinancingRequestDocument" RENAME TO "FinancingRequestDocument_archive";
  END IF;
END $$;

-- 4) Verify
SELECT
  (SELECT COUNT(*) FROM "FinancingRequestDocument_archive") AS archived_legacy_rows,
  (SELECT COUNT(*) FROM "TenantFinancingDocument") AS tenant_financing_doc_rows;
