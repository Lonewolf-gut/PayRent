import type { UserRole, WalletType } from "@prisma/client";

export const USER_WALLET_TYPE: Partial<Record<UserRole, WalletType>> = {
  TENANT: "TENANT",
  LANDLORD: "LANDLORD",
  LENDER: "LENDER",
  AGENT: "AGENT",
};

export const DEPOSIT_ROLES: UserRole[] = ["TENANT", "LANDLORD", "LENDER", "AGENT"];

export const WITHDRAW_ROLES: UserRole[] = [
  "TENANT",
  "LANDLORD",
  "LENDER",
  "AGENT",
  "ADMIN",
];

export function getWalletTypeForRole(role: UserRole): WalletType | null {
  if (role === "ADMIN") return "PLATFORM";
  return USER_WALLET_TYPE[role] ?? null;
}

export function canDeposit(role: UserRole) {
  return DEPOSIT_ROLES.includes(role);
}

export function canWithdraw(role: UserRole) {
  return WITHDRAW_ROLES.includes(role);
}

export function usesPlatformWallet(role: UserRole) {
  return role === "ADMIN";
}
