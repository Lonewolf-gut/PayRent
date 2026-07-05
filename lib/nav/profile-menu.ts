import type { UserRole } from "@prisma/client";
import { SUBSCRIPTION_ROUTES } from "@/lib/auth/permissions";

export type ProfileMenuItem = {
  href: string;
  label: string;
};

export const PROFILE_MENU_ITEMS: Record<UserRole, ProfileMenuItem[]> = {
  TENANT: [
    { href: "/dashboard/tenant", label: "Overview" },
    { href: "/dashboard/tenant/wallet", label: "Wallet" },
    { href: "/dashboard/tenant/properties", label: "Saved" },
    { href: "/dashboard/tenant/applications", label: "Applications" },
    { href: "/dashboard/tenant/financing", label: "Pay for Rent" },
    { href: "/dashboard/tenant/settings", label: "Settings" },
    { href: "/dashboard/tenant/kyc", label: "Profile & KYC" },
  ],
  LANDLORD: [
    { href: "/dashboard/landlord", label: "Overview" },
    { href: "/dashboard/landlord/properties", label: "My Listings" },
    { href: "/dashboard/landlord/wallet", label: "Wallet" },
    { href: SUBSCRIPTION_ROUTES.LANDLORD, label: "Subscription" },
    { href: "/dashboard/landlord/applications", label: "Applications" },
    { href: "/dashboard/landlord/settings", label: "Settings" },
    { href: "/dashboard/landlord/kyc", label: "Profile & KYC" },
  ],
  AGENT: [
    { href: "/dashboard/agent", label: "Overview" },
    { href: "/dashboard/agent/listings", label: "Assigned Listings" },
    { href: "/dashboard/agent/wallet", label: "Wallet" },
    { href: SUBSCRIPTION_ROUTES.AGENT, label: "Subscription" },
    { href: "/dashboard/agent/applications", label: "Applications" },
    { href: "/dashboard/agent/settings", label: "Settings" },
    { href: "/dashboard/agent/kyc", label: "Profile & KYC" },
  ],
  LENDER: [
    { href: "/dashboard/lender", label: "Overview" },
    { href: "/dashboard/lender/opportunities", label: "Financing Queue" },
    { href: "/dashboard/lender/wallet", label: "Wallet" },
    { href: "/dashboard/lender/portfolio", label: "Portfolio" },
    { href: "/dashboard/lender/settings", label: "Settings" },
    { href: "/dashboard/lender/kyc", label: "Profile & KYC" },
  ],
  ADMIN: [
    { href: "/admin", label: "Overview" },
    { href: "/admin/wallet", label: "Platform Wallet" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/properties", label: "Listings" },
    { href: "/admin/settings", label: "Settings" },
  ],
};
