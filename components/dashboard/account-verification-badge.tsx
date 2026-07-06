"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  deriveAccountStatusLabel,
  type VerificationStatusSnapshot,
} from "@/lib/utils/account-verification";
import type { UserRole } from "@prisma/client";

const KYC_ROUTES: Partial<Record<UserRole, string>> = {
  TENANT: "/dashboard/tenant/kyc",
  LANDLORD: "/dashboard/landlord/kyc",
  AGENT: "/dashboard/agent/kyc",
  LENDER: "/dashboard/lender/kyc",
};

type KycStatus = VerificationStatusSnapshot;

function deriveAccountStatus(status?: KycStatus) {
  return deriveAccountStatusLabel(status);
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
