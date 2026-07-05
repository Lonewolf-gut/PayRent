"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@prisma/client";

const KYC_ROUTES: Partial<Record<UserRole, string>> = {
  TENANT: "/dashboard/tenant/kyc",
  LANDLORD: "/dashboard/landlord/kyc",
  AGENT: "/dashboard/agent/kyc",
  LENDER: "/dashboard/lender/kyc",
};

type KycStatus = {
  profileStatus?: string;
  kycVerified?: boolean;
  identityVerified?: boolean;
  verifications?: { type: string; status: string }[];
  bankAccounts?: { isVerified?: boolean; validationStatus?: string }[];
};

function deriveAccountStatus(status?: KycStatus) {
  if (!status) {
    return { label: "Unverified", className: "bg-amber-100 text-amber-800" };
  }

  const profileComplete =
    status.profileStatus === "PROFILE_COMPLETED" || status.profileStatus === "KYC_VERIFIED";
  const identityVerified = Boolean(status.kycVerified || status.identityVerified);
  const identityPending =
    status.verifications?.some((v) => v.type === "IDENTITY" && v.status === "PENDING") ?? false;
  const bankVerified = status.bankAccounts?.some((b) => b.isVerified) ?? false;
  const bankPending =
    status.bankAccounts?.some((b) => b.validationStatus === "PENDING") ?? false;

  if (profileComplete && identityVerified && bankVerified) {
    return { label: "Verified", className: "bg-emerald-100 text-emerald-800" };
  }

  if (identityPending || bankPending) {
    return { label: "Pending", className: "bg-sky-100 text-sky-800" };
  }

  return { label: "Unverified", className: "bg-amber-100 text-amber-800" };
}

export function AccountVerificationBadge() {
  const { data: session } = useSession();
  const role = session?.user?.role;

  const { data: status } = useQuery({
    queryKey: ["kyc-status"],
    queryFn: async () => {
      const res = await fetch("/api/kyc");
      const json = await res.json();
      return json.data as KycStatus;
    },
    enabled: !!session?.user?.id && !!role && role in KYC_ROUTES,
    staleTime: 1000 * 60 * 5,
  });

  if (!role || !(role in KYC_ROUTES)) return null;

  const accountStatus = deriveAccountStatus(status);
  const href = KYC_ROUTES[role]!;

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex w-fit rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
        accountStatus.className
      )}
    >
      {accountStatus.label}
    </Link>
  );
}
