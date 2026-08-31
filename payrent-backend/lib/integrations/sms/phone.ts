/**
 * Normalizes Ghana phone numbers to E.164 (+233...) for SMS providers.
 */
export function normalizeGhanaPhone(phone: string): string {
  const trimmed = phone.trim().replace(/\s+/g, "");
  if (trimmed.startsWith("+")) return trimmed;
  if (trimmed.startsWith("233")) return `+${trimmed}`;
  if (trimmed.startsWith("0")) return `+233${trimmed.slice(1)}`;
  return `+233${trimmed}`;
}
