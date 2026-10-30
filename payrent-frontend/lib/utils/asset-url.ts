/**
 * Resolve property and upload asset URLs for browser display.
 * Property images are served through /api/media so S3 private buckets work.
 */
function isPropertyImageReference(value: string): boolean {
  return value.includes("properties/images/");
}

function shouldProxyMediaUrl(value: string): boolean {
  if (value.startsWith("/api/files/public") || value.startsWith("/api/media")) return false;
  if (value.startsWith("public/") && value.includes("properties/images/")) return true;
  if (value.startsWith("/uploads/")) return true;
  if (value.includes("properties/images/")) return true;
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value.includes("properties/images/") || value.includes("/uploads/properties/");
  }
  return false;
}

export function resolveAssetUrl(url: string | null | undefined): string {
  if (!url) return "";

  const trimmed = url.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("/api/files/public") || trimmed.startsWith("/api/media")) {
    return trimmed;
  }

  if (shouldProxyMediaUrl(trimmed)) {
    return `/api/media?ref=${encodeURIComponent(trimmed)}`;
  }

  if (isPropertyImageReference(trimmed) && !trimmed.startsWith("http")) {
    return `/api/media?ref=${encodeURIComponent(trimmed)}`;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.pathname.startsWith("/uploads/")) {
        return `/api/media?ref=${encodeURIComponent(`${parsed.pathname}${parsed.search}`)}`;
      }
    } catch {
      return trimmed;
    }
    return trimmed;
  }

  if (trimmed.startsWith("public/")) {
    return `/api/media?ref=${encodeURIComponent(trimmed)}`;
  }

  if (trimmed.startsWith("private/")) {
    return `/api/files/${encodeURIComponent(trimmed)}`;
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}
