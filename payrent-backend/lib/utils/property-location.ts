export type StructuredLocationParts = {
  region?: string | null;
  city?: string | null;
  area?: string | null;
  street?: string | null;
  houseNumber?: string | null;
  digitalAddress?: string | null;
  landmark?: string | null;
  address?: string | null;
};

export function formatStructuredAddress(parts: StructuredLocationParts): string {
  const line1 = [parts.houseNumber, parts.street].filter(Boolean).join(" ");
  const line2 = [parts.area, parts.city, parts.region].filter(Boolean).join(", ");
  const segments = [
    line1,
    line2,
    parts.digitalAddress,
    parts.landmark,
    parts.address,
  ]
    .map((s) => s?.trim())
    .filter(Boolean);
  return [...new Set(segments)].join(" · ") || "";
}

export function buildLocationString(parts: StructuredLocationParts): string {
  return formatStructuredAddress(parts).trim();
}

export function hasStructuredLocation(parts: StructuredLocationParts): boolean {
  return Boolean(
    parts.region?.trim() ||
      parts.city?.trim() ||
      parts.area?.trim() ||
      parts.street?.trim() ||
      parts.houseNumber?.trim() ||
      parts.digitalAddress?.trim() ||
      parts.landmark?.trim()
  );
}
