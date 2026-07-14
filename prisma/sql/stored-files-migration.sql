-- User uploads stored in database (binary) per user

DO $$ BEGIN
  CREATE TYPE "StoredFileCategory" AS ENUM (
    'KYC',
    'APPLICATION',
    'FINANCING',
    'MANDATE',
    'PROFILE',
    'PROPERTY'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "UserStoredFile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "category" "StoredFileCategory" NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "data" BYTEA NOT NULL,
  "relatedEntityType" TEXT,
  "relatedEntityId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserStoredFile_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UserStoredFile_userId_idx" ON "UserStoredFile"("userId");
CREATE INDEX IF NOT EXISTS "UserStoredFile_category_idx" ON "UserStoredFile"("category");
CREATE INDEX IF NOT EXISTS "UserStoredFile_relatedEntityType_relatedEntityId_idx"
  ON "UserStoredFile"("relatedEntityType", "relatedEntityId");

DO $$ BEGIN
  ALTER TABLE "UserStoredFile"
    ADD CONSTRAINT "UserStoredFile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
