/**
 * Prisma schema declares directUrl = env("DIRECT_URL").
 * If unset, default to DATABASE_URL (valid for direct Supabase / local Postgres).
 * Supabase pooler (6543) on DATABASE_URL still requires an explicit DIRECT_URL (5432 direct).
 */
const direct = process.env.DIRECT_URL?.trim();
const database = process.env.DATABASE_URL?.trim();

if (!direct && database) {
  process.env.DIRECT_URL = database;
  console.warn(
    "[prisma] DIRECT_URL was missing — using DATABASE_URL. " +
      "Supabase with pooler (port 6543): set DIRECT_URL to the direct connection (5432) in .env."
  );
}

if (!process.env.DIRECT_URL?.trim()) {
  console.error(
    "Missing DATABASE_URL and DIRECT_URL. Add DATABASE_URL to PayRent-Backend/.env (see .env.example or docs/supabase-database.md)."
  );
  process.exit(1);
}
