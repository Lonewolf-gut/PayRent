/**
 * Supabase + Prisma connection helpers.
 * @see docs/supabase-database.md
 */

export function getRawDatabaseUrl(): string {
  return process.env.DATABASE_URL?.trim() ?? "";
}

export function isSupabaseDatabaseUrl(url = getRawDatabaseUrl()): boolean {
  return /supabase\.(co|com|in)/i.test(url) || /\.pooler\.supabase\.com/i.test(url);
}

function appendParam(url: string, key: string, value: string): string {
  if (new RegExp(`[?&]${key}=`, "i").test(url)) {
    return url;
  }
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${key}=${encodeURIComponent(value)}`;
}

/**
 * Ensures SSL and pooler flags Supabase expects with Prisma.
 */
export function normalizeDatabaseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return trimmed;
  }

  let url = trimmed;

  if (isSupabaseDatabaseUrl(url)) {
    url = appendParam(url, "sslmode", "require");

    const usesPooler =
      /:6543(\/|$)/.test(url) ||
      /\.pooler\.supabase\.com/i.test(url) ||
      /[?&]pgbouncer=true/i.test(url);

    if (usesPooler) {
      url = appendParam(url, "pgbouncer", "true");
    }
  }

  url = appendParam(url, "connect_timeout", "30");

  return url;
}

export function getRuntimeDatabaseUrl(): string {
  return normalizeDatabaseUrl(getRawDatabaseUrl());
}

export function getDirectDatabaseUrl(): string | undefined {
  const direct = process.env.DIRECT_URL?.trim();
  if (direct) {
    return normalizeDatabaseUrl(direct);
  }
  if (isSupabaseDatabaseUrl()) {
    return undefined;
  }
  return getRuntimeDatabaseUrl();
}

export function getDatabaseUnavailableHint(): string {
  if (isSupabaseDatabaseUrl()) {
    return (
      "Cannot reach Supabase Postgres. In PayRent-Backend .env use the Supabase pooler URL (port 6543) " +
      "for DATABASE_URL, direct URL (port 5432) for DIRECT_URL, then run npm run db:push. " +
      "See docs/supabase-database.md."
    );
  }

  return (
    "Postgres is not reachable. Use Supabase DATABASE_URL in .env, or for local dev: " +
    "docker compose up -d postgres redis"
  );
}
