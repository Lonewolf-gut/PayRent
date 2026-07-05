import type { BillingCycle, SubscriptionPlan, UserRole, WalletType } from "@prisma/client";
import { cacheDel, cacheGet, cacheSet } from "@/lib/redis/client";

export type PendingPaymentPurpose = "WALLET_DEPOSIT" | "SUBSCRIPTION";
export type PendingPaymentMethod = "MOMO" | "BANK";

type PendingPaymentBase = {
  userId: string;
  amount: number;
  provider: "hubtel" | "paystack";
};

export type WalletDepositPendingSession = PendingPaymentBase & {
  purpose: "WALLET_DEPOSIT";
  walletType: WalletType;
  bankAccountId: string;
  method: PendingPaymentMethod;
  phone?: string;
};

export type SubscriptionPendingSession = PendingPaymentBase & {
  purpose: "SUBSCRIPTION";
  plan: SubscriptionPlan;
  billingCycle: BillingCycle;
  role: UserRole;
};

export type PendingPaymentSession = WalletDepositPendingSession | SubscriptionPendingSession;

const PREFIX = "payment:pending:";

export async function savePendingPayment(
  clientReference: string,
  session: PendingPaymentSession
) {
  await cacheSet(`${PREFIX}${clientReference}`, session, 60 * 60 * 24);
}

export async function getPendingPayment(clientReference: string) {
  return cacheGet<PendingPaymentSession>(`${PREFIX}${clientReference}`);
}

export async function deletePendingPayment(clientReference: string) {
  await cacheDel(`${PREFIX}${clientReference}`);
}

const COMPLETED_PREFIX = "payment:completed:";

export async function markPaymentCompleted<T>(clientReference: string, result: T) {
  await cacheSet(`${COMPLETED_PREFIX}${clientReference}`, result, 60 * 60 * 24 * 7);
}

export async function getCompletedPayment<T>(clientReference: string) {
  return cacheGet<T>(`${COMPLETED_PREFIX}${clientReference}`);
}
