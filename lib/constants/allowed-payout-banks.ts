import { isPaystackConfigured } from "@/lib/integrations/paystack/config";
import {
  listPaystackBanks,
  paystackBankResolveCode,
  type PaystackBank,
} from "@/lib/integrations/paystack/banks";
import { AppError } from "@/lib/errors";

export type PayoutBankProvider = {
  code: string;
  name: string;
  /** Code sent to Paystack `/bank/resolve` (may differ from dropdown `code`). */
  resolveCode: string;
  alternateResolveCodes?: string[];
};

/** Canonical partner banks accepted for payout account lookup. */
export const ALLOWED_PAYOUT_BANK_DEFINITIONS = [
  {
    key: "gcb",
    name: "GCB Bank",
    paystackCodes: ["040"],
    matches: (bankName: string) =>
      /\bgcb\b/i.test(bankName) || /ghana commercial/i.test(bankName),
  },
  {
    key: "cbg",
    name: "Consolidated Bank Ghana",
    paystackCodes: ["340"],
    matches: (bankName: string) => /consolidated bank/i.test(bankName),
  },
  {
    key: "adb",
    name: "Agricultural Development Bank",
    paystackCodes: ["080"],
    matches: (bankName: string) =>
      /agricultural development/i.test(bankName) ||
      /\badb\b/i.test(bankName),
  },
  {
    key: "zenith",
    name: "Zenith Bank",
    paystackCodes: ["1201"],
    matches: (bankName: string) => /zenith/i.test(bankName),
  },
] as const;

/** Shown when Paystack is unavailable — manual entry only (no live lookup). */
export const ALLOWED_PAYOUT_BANK_FALLBACKS: PayoutBankProvider[] = [
  { code: "GCB", name: "GCB Bank", resolveCode: "GCB" },
  { code: "CBG", name: "Consolidated Bank Ghana", resolveCode: "CBG" },
  { code: "ADB", name: "Agricultural Development Bank", resolveCode: "ADB" },
  { code: "ZENITH", name: "Zenith Bank", resolveCode: "ZENITH" },
];

function pickAllowedPaystackBank(
  banks: Array<Pick<PaystackBank, "code" | "longcode" | "name" | "slug">>,
  definition: (typeof ALLOWED_PAYOUT_BANK_DEFINITIONS)[number]
) {
  const matches = banks.filter((bank) => definition.matches(bank.name));
  if (!matches.length) return null;

  const preferred =
    matches.find((bank) => definition.paystackCodes.includes(bank.code.trim())) ??
    matches[0];

  const resolveCode = paystackBankResolveCode(preferred);
  const alternateResolveCodes = [
    preferred.longcode?.trim(),
    ...definition.paystackCodes,
  ].filter(
    (code, index, all): code is string =>
      Boolean(code) && all.indexOf(code) === index && code !== resolveCode
  );

  return {
    code: preferred.code.trim(),
    name: definition.name,
    resolveCode,
    alternateResolveCodes,
  } satisfies PayoutBankProvider;
}

export function isAllowedPayoutBankName(bankName: string) {
  const normalized = bankName.trim();
  if (!normalized) return false;
  return ALLOWED_PAYOUT_BANK_DEFINITIONS.some((bank) => bank.matches(normalized));
}

export function filterAllowedPaystackBanks(
  banks: Array<Pick<PaystackBank, "code" | "longcode" | "name" | "slug">>
): PayoutBankProvider[] {
  const providers: PayoutBankProvider[] = [];

  for (const definition of ALLOWED_PAYOUT_BANK_DEFINITIONS) {
    const match = pickAllowedPaystackBank(banks, definition);
    if (match) providers.push(match);
  }

  return providers;
}

export function findAllowedPayoutBankProvider(
  bankCode: string,
  providers: PayoutBankProvider[]
) {
  const normalized = bankCode.trim();
  return providers.find(
    (provider) =>
      provider.code === normalized || provider.resolveCode === normalized
  );
}

export async function getAllowedPayoutBankProviders(): Promise<PayoutBankProvider[]> {
  if (!isPaystackConfigured()) {
    return ALLOWED_PAYOUT_BANK_FALLBACKS;
  }

  const banks = await listPaystackBanks({ type: "ghipss", country: "ghana" });
  const filtered = filterAllowedPaystackBanks(banks);
  if (filtered.length) return filtered;

  throw new AppError(
    "Could not load supported bank codes from Paystack. Please try again shortly.",
    503,
    "PAYOUT_BANKS_UNAVAILABLE"
  );
}

export function isAllowedPayoutBankCode(
  bankCode: string,
  providers: PayoutBankProvider[]
) {
  const normalized = bankCode.trim();
  if (!normalized) return false;
  return providers.some(
    (provider) =>
      provider.code === normalized || provider.resolveCode === normalized
  );
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

  if (bankCode && isAllowedPayoutBankCode(bankCode, providers)) {
    return;
  }

  const byProviderName = providers.find(
    (provider) => provider.name.toLowerCase() === bankName.toLowerCase()
  );
  if (byProviderName) return;

  if (isAllowedPayoutBankName(bankName)) return;

  throw new AppError(
    "Only GCB Bank, Consolidated Bank Ghana (CBG), Agricultural Development Bank (ADB), and Zenith Bank accounts can be added.",
    400,
    "BANK_NOT_ALLOWED"
  );
}
