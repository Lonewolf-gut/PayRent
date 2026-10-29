import { paystackRequest } from "@/lib/integrations/paystack/client";

export type PaystackBank = {
  id: number;
  name: string;
  slug: string;
  code: string;
  longcode?: string;
  type: string;
  currency: string;
};

/** Primary code for Paystack `/bank/resolve` — always the list-banks `code`. */
export function paystackBankResolveCode(bank: Pick<PaystackBank, "code" | "longcode">) {
  return bank.code.trim();
}

export async function listPaystackBanks(params?: {
  currency?: string;
  country?: string;
  type?: "ghipss" | "mobile_money";
}) {
  const search = new URLSearchParams();
  const country = params?.country ?? "ghana";
  const type = params?.type;

  // Ghana channel lists use country + type (not currency) per Paystack docs.
  if (type === "ghipss" || type === "mobile_money") {
    search.set("country", country);
    search.set("type", type);
  } else if (params?.country) {
    search.set("country", params.country);
    if (params.currency) search.set("currency", params.currency);
  } else {
    search.set("currency", params?.currency ?? "GHS");
  }

  const response = await paystackRequest<PaystackBank[]>(`/bank?${search.toString()}`, {
    method: "GET",
  });

  return response.data;
}

async function resolvePaystackAccountWithCode(params: {
  accountNumber: string;
  bankCode: string;
}) {
  const search = new URLSearchParams({
    account_number: params.accountNumber.trim(),
    bank_code: params.bankCode.trim(),
  });

  const response = await paystackRequest<{
    account_number: string;
    account_name: string;
    bank_id?: number;
  }>(`/bank/resolve?${search.toString()}`, { method: "GET" });

  return {
    accountNumber: response.data.account_number,
    accountName: response.data.account_name,
    bankId: response.data.bank_id,
  };
}

export async function resolvePaystackAccount(params: {
  accountNumber: string;
  bankCode: string;
  alternateBankCodes?: string[];
}) {
  const primaryCode = params.bankCode.trim();
  const alternates = (params.alternateBankCodes ?? [])
    .map((code) => code.trim())
    .filter((code) => code && code !== primaryCode);

  try {
    return await resolvePaystackAccountWithCode({
      accountNumber: params.accountNumber,
      bankCode: primaryCode,
    });
  } catch (error) {
    for (const bankCode of alternates) {
      try {
        return await resolvePaystackAccountWithCode({
          accountNumber: params.accountNumber,
          bankCode,
        });
      } catch {
        // Try the next known code variant for this bank.
      }
    }
    throw error;
  }
}

export const GHANA_MOMO_NETWORKS = [
  { code: "MTN", name: "MTN Mobile Money" },
  { code: "VOD", name: "Telecel Cash (Vodafone)" },
  { code: "ATL", name: "AirtelTigo Money" },
] as const;

const GHANA_MOMO_DEFINITIONS = [
  {
    name: "MTN Mobile Money",
    matches: (bankName: string) => /\bmtn\b/i.test(bankName),
  },
  {
    name: "Telecel Cash (Vodafone)",
    matches: (bankName: string) => /vodafone|telecel|\bvod\b/i.test(bankName),
  },
  {
    name: "AirtelTigo Money",
    matches: (bankName: string) => /airteltigo|\btigo\b|\batl\b/i.test(bankName),
  },
] as const;

export function filterPaystackMomoProviders(
  banks: Array<Pick<PaystackBank, "code" | "name">>
) {
  const providers: Array<{ code: string; name: string }> = [];

  for (const definition of GHANA_MOMO_DEFINITIONS) {
    const match = banks.find((bank) => definition.matches(bank.name));
    if (match) {
      providers.push({
        code: match.code,
        name: definition.name,
      });
    }
  }

  return providers.length ? providers : [...GHANA_MOMO_NETWORKS];
}

export function normalizeGhanaPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("233") && digits.length === 12) return `0${digits.slice(3)}`;
  if (digits.startsWith("0") && digits.length === 10) return digits;
  return digits;
}
