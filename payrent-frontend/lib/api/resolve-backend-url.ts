function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}

/**
 * Backend origin for server-side fetch and Next.js rewrites.
 * Env name must be `API_URL` (see .env.example). Aliases are accepted for common typos.
 */
export function resolveBackendApiOrigin(): string {
  const candidates = [
    process.env.API_URL,
    process.env.BACKEND_URL,
    process.env.PAYRENT_API_URL,
    process.env.NEXT_PUBLIC_API_URL,
  ];

  for (const value of candidates) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimTrailingSlash(trimmed);
    }
  }

  return "http://localhost:3001";
}

export function warnMisconfiguredBackendUrl(): void {
  const origin = resolveBackendApiOrigin();
  if (/localhost:3000|:3000(\/|$)/i.test(origin)) {
    console.warn(
      "[payrent-frontend] API_URL/BACKEND_URL points at the frontend (port 3000). " +
        "Set API_URL=http://localhost:3001 in PayRent-Frontend/.env and restart npm run dev."
    );
  }
}
