-- FinancingRequestDocument (per financing request). Safe to run in Supabase SQL Editor.
-- 1) Restores renamed archive table if present
-- 2) Creates the table if missing (does not drop existing data)

DO $$
BEGIN
  IF to_regclass('public."FinancingRequestDocument_archive"') IS NOT NULL
     AND to_regclass('public."FinancingRequestDocument"') IS NULL THEN
    ALTER TABLE "FinancingRequestDocument_archive" RENAME TO "FinancingRequestDocument";
    RAISE NOTICE 'Renamed FinancingRequestDocument_archive → FinancingRequestDocument';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "FinancingRequestDocument" (
  "id" TEXT NOT NULL,
  "financingRequestId" TEXT NOT NULL,
  "documentType" "TenantFinancingDocType" NOT NULL,
  "fileName" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "status" "FinancingDocReviewStatus" NOT NULL DEFAULT 'PENDING',
  "reviewNotes" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FinancingRequestDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FinancingRequestDocument_financingRequestId_documentType_key"
  ON "FinancingRequestDocument"("financingRequestId", "documentType");

CREATE INDEX IF NOT EXISTS "FinancingRequestDocument_financingRequestId_idx"
  ON "FinancingRequestDocument"("financingRequestId");

CREATE INDEX IF NOT EXISTS "FinancingRequestDocument_status_idx"
  ON "FinancingRequestDocument"("status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FinancingRequestDocument_financingRequestId_fkey'
  ) THEN
    ALTER TABLE "FinancingRequestDocument"
      ADD CONSTRAINT "FinancingRequestDocument_financingRequestId_fkey"
      FOREIGN KEY ("financingRequestId") REFERENCES "FinancingRequest"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Optional: copy rows from legacy TenantFinancingDocument onto each tenant's latest financing request
-- (only when FinancingRequestDocument is empty and TenantFinancingDocument exists)
INSERT INTO "FinancingRequestDocument" (
  "id",
  "financingRequestId",
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
  tfd."id",
  fr."id",
  tfd."documentType",
  tfd."fileName",
  tfd."fileUrl",
  tfd."status",
  tfd."reviewNotes",
  tfd."reviewedAt",
  tfd."reviewedBy",
  tfd."createdAt",
  tfd."updatedAt"
FROM "TenantFinancingDocument" tfd
INNER JOIN LATERAL (
  SELECT fr2."id"
  FROM "FinancingRequest" fr2
  WHERE fr2."tenantId" = tfd."tenantId"
  ORDER BY fr2."createdAt" DESC
  LIMIT 1
) fr ON true
WHERE to_regclass('public."TenantFinancingDocument"') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "FinancingRequestDocument" LIMIT 1)
ON CONFLICT ("financingRequestId", "documentType") DO NOTHING;

SELECT
  (SELECT COUNT(*) FROM "FinancingRequestDocument") AS financing_request_document_rows;
