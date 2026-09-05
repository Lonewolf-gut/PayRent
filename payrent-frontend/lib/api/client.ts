/**
 * Resolve API paths for the separated backend.
 * When NEXT_PUBLIC_API_URL is unset, relative /api/* requests are proxied by Next.js rewrites.
 */
export function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
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
