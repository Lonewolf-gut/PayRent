export type ReddePaymentOption = "MTN" | "AIRTELTIGO" | "VODAFONE" | "BANK";

const MOMO_NETWORK_MAP: Record<string, ReddePaymentOption> = {
  MTN: "MTN",
  "MTN MOBILE MONEY": "MTN",
  TELECEL: "VODAFONE",
  VODAFONE: "VODAFONE",
  "VODAFONE CASH": "VODAFONE",
  AIRTELTIGO: "AIRTELTIGO",
  AIRTEL: "AIRTELTIGO",
  TIGO: "AIRTELTIGO",
};

export function mapMomoBankNameToReddeOption(bankName: string): ReddePaymentOption {
  const key = bankName.trim().toUpperCase();
  return MOMO_NETWORK_MAP[key] ?? "MTN";
}

export function normalizeReddeWalletNumber(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("233")) return digits;
  if (digits.startsWith("0")) return `233${digits.slice(1)}`;
  if (digits.length === 9) return `233${digits}`;
  return digits;
}

export function reddeBankReceiveOption() {
  const value = process.env.REDDE_BANK_PAYMENT_OPTION?.trim().toUpperCase();
  return value || "BANK";
}
