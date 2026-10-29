/** Matches backend CBG detection for Pay-for-me mandate routing. */
export function isCbgBankAccount(bankCode?: string | null, bankName?: string | null) {
  const code = bankCode?.trim();
  if (code === "340" || code === "CBG") return true;

  const name = bankName?.trim().toLowerCase() ?? "";
  if (/consolidated bank/i.test(name)) return true;

  return false;
}

export const CBG_BANK_DISPLAY_NAME = "Consolidated Bank Ghana (CBG)";
