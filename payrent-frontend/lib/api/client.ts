/**
 * Resolve API paths for the separated backend.
 * Browser: relative /api/* when NEXT_PUBLIC_API_URL is unset (Next.js rewrites).
 * Server: must use an absolute URL (API_URL or http://localhost:3001).
 */
function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}

export function getServerApiOrigin(): string {
  return trimTrailingSlash(
    process.env.API_URL?.trim() ||
      process.env.NEXT_PUBLIC_API_URL?.trim() ||
      "http://localhost:3001"
  );
}

export function getApiBaseUrl(): string {
  if (typeof window === "undefined") {
    return getServerApiOrigin();
  }
  return trimTrailingSlash(process.env.NEXT_PUBLIC_API_URL ?? "");
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const base = getApiBaseUrl();
  return base ? `${base}${normalized}` : normalized;
}

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), {
    credentials: init?.credentials ?? "include",
    ...init,
  });
}
