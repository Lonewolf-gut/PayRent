/** Parses "Bank statement period: N months" from financing request notes. */
export function parseBuyerIncomeProofPeriodMonths(notes?: string | null): number | null {
  const match = notes?.match(/Bank statement period:\s*(\d+)\s*months/i);
  if (!match) return null;
  const months = Number(match[1]);
  return Number.isFinite(months) && months > 0 ? months : null;
}

export function formatBuyerIncomeProofPeriodLabel(notes?: string | null): string {
  const months = parseBuyerIncomeProofPeriodMonths(notes);
  if (months == null) return "Not provided";
  if (months === 12) return "1 year";
  return `${months} months`;
}
