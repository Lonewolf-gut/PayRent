-- Fix duplicate empty phone values blocking registration (phone is UNIQUE).
-- Run once against your database, e.g. psql or Prisma Studio SQL.

UPDATE "User"
SET phone = NULL
WHERE phone IS NOT NULL AND TRIM(phone) = '';
