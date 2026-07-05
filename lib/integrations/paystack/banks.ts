import { paystackRequest } from "@/lib/integrations/paystack/client";

export type PaystackBank = {
  id: number;
  name: string;
  slug: string;
  code: string;
  type: string;
  currency: string;
};

export async function listPaystackBanks(params?: {
  currency?: string;
  type?: "ghipss" | "mobile_money";
}) {
  const search = new URLSearchParams({
    currency: params?.currency ?? "GHS",
  });
  if (params?.type) search.set("type", params.type);

  const response = await paystackRequest<PaystackBank[]>(`/bank?${search.toString()}`, {
    method: "GET",
  });

  return response.data;
}

export async function resolvePaystackAccount(params: {
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

export const GHANA_MOMO_NETWORKS = [
  { code: "MTN", name: "MTN Mobile Money" },
  { code: "VOD", name: "Telecel Cash (Vodafone)" },
  { code: "TIG", name: "AirtelTigo Money" },
] as const;

export function normalizeGhanaPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("233") && digits.length === 12) return `0${digits.slice(3)}`;
  if (digits.startsWith("0") && digits.length === 10) return digits;
  return digits;
}
