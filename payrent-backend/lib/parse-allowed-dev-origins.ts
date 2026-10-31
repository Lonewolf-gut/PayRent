/** Hostnames allowed to load Next.js dev assets (e.g. ngrok tunnel for Redde webhooks). */
export function parseAllowedDevOrigins(): string[] {
  const hosts = new Set<string>();

  for (const part of (process.env.ALLOWED_DEV_ORIGINS ?? "").split(",")) {
    const trimmed = part.trim();
    if (trimmed) hosts.add(trimmed.replace(/^https?:\/\//, "").split("/")[0]!);
  }

  for (const envKey of ["PUBLIC_API_URL", "NGROK_URL", "REDDE_CALLBACK_PUBLIC_ORIGIN"]) {
    const value = process.env[envKey]?.trim();
    if (!value) continue;
    try {
      hosts.add(new URL(value).hostname);
    } catch {
      // ignore invalid URLs
    }
  }

  return [...hosts];
}
