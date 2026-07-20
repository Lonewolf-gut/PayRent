import { listPaystackBanks, type PaystackBank } from "@/lib/integrations/paystack/banks";
import { AppError } from "@/lib/errors";

export type PayoutBankProvider = {
  code: string;
  name: string;
};

/** Canonical partner banks accepted for payout account lookup. */
export const ALLOWED_PAYOUT_BANK_DEFINITIONS = [
  {
    key: "gcb",
    name: "GCB Bank",
    matches: (bankName: string) =>
      /\bgcb\b/i.test(bankName) || /ghana commercial/i.test(bankName),
  },
  {
    key: "cbg",
    name: "Consolidated Bank Ghana",
    matches: (bankName: string) => /consolidated bank/i.test(bankName),
  },
  {
    key: "adb",
    name: "Agricultural Development Bank",
    matches: (bankName: string) =>
      /agricultural development/i.test(bankName) ||
      /\badb\b/i.test(bankName),
  },
  {
    key: "zenith",
    name: "Zenith Bank",
    matches: (bankName: string) => /zenith/i.test(bankName),
  },
] as const;

/** Used when Paystack is unavailable; codes are resolved from Paystack when configured. */
export const ALLOWED_PAYOUT_BANK_FALLBACKS: PayoutBankProvider[] = [
  { code: "040", name: "GCB Bank" },
  { code: "340", name: "Consolidated Bank Ghana" },
  { code: "080", name: "Agricultural Development Bank" },
  { code: "1201", name: "Zenith Bank" },
];

export function isAllowedPayoutBankName(bankName: string) {
  const normalized = bankName.trim();
  if (!normalized) return false;
  return ALLOWED_PAYOUT_BANK_DEFINITIONS.some((bank) => bank.matches(normalized));
}

export function filterAllowedPaystackBanks(
  banks: Array<Pick<PaystackBank, "code" | "name">>
): PayoutBankProvider[] {
  const providers: PayoutBankProvider[] = [];

  for (const definition of ALLOWED_PAYOUT_BANK_DEFINITIONS) {
    const match = banks.find((bank) => definition.matches(bank.name));
    if (match) {
      providers.push({
        code: match.code,
        name: definition.name,
      });
    }
  }

  return providers;
}

export async function getAllowedPayoutBankProviders(): Promise<PayoutBankProvider[]> {
  try {
    const banks = await listPaystackBanks({ type: "ghipss" });
    const filtered = filterAllowedPaystackBanks(banks);
    if (filtered.length) return filtered;
  } catch {
    // Fall back to static list below.
  }

  return ALLOWED_PAYOUT_BANK_FALLBACKS;
}

export function assertAllowedPayoutBank(params: {
  accountType: "BANK" | "MOMO";
  bankCode?: string | null;
  bankName: string;
  providers?: PayoutBankProvider[];
}) {
  if (params.accountType !== "BANK") return;

  const providers = params.providers ?? ALLOWED_PAYOUT_BANK_FALLBACKS;
  const bankCode = params.bankCode?.trim();
  const bankName = params.bankName.trim();

  const byCode = bankCode
    ? providers.find((provider) => provider.code === bankCode)
    : null;
  const byProviderName = providers.find(
    (provider) => provider.name.toLowerCase() === bankName.toLowerCase()
  );
  const byMatcher = isAllowedPayoutBankName(bankName);

  if (!byCode && !byProviderName && !byMatcher) {
    throw new AppError(
      "Only GCB Bank, Consolidated Bank Ghana (CBG), Agricultural Development Bank (ADB), and Zenith Bank accounts can be added.",
      400,
      "BANK_NOT_ALLOWED"
    );
  }
}
