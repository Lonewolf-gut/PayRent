import { getBackendApiBaseUrl } from "@/lib/utils/backend-api-url";

/**
 * Resolve API paths for the separated backend.
 * Browser calls may use relative `/api/*` (Next.js rewrites). Server-side calls
 * (e.g. NextAuth authorize) must use an absolute backend URL.
 */
export function getApiBaseUrl(): string {
  const configured = getBackendApiBaseUrl();
  if (configured) return configured;
  if (typeof window !== "undefined") return "";
  return (process.env.API_URL ?? "http://localhost:3001").replace(/\/$/, "");
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
