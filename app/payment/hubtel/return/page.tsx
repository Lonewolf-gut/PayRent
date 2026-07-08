"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@prisma/client";

const WALLET_PATH: Partial<Record<UserRole, string>> = {
  BUYER: "/dashboard/buyer/wallet",
  MERCHANT: "/dashboard/merchant/wallet",
  LENDER: "/dashboard/lender/wallet",
  MARKETER: "/dashboard/marketer/wallet",
  ADMIN: "/admin/wallet",
};

export default function HubtelPaymentReturnPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const reference = searchParams.get("reference");
  const [message, setMessage] = useState("Checking payment status…");

  const walletHref = session?.user?.role
    ? WALLET_PATH[session.user.role as UserRole] ?? "/"
    : "/";

  useEffect(() => {
    if (status === "cancelled") {
      setMessage("Payment was cancelled. You can try again from your wallet.");
      return;
    }

    if (!reference) {
      setMessage("Payment completed. Return to your wallet to see your updated balance.");
      return;
    }

    fetch(`/api/payments/deposit?reference=${encodeURIComponent(reference)}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.data?.wallet && !json.data?.wallet?.alreadyProcessed) {
          setMessage("Payment successful. Your wallet has been credited.");
        } else if (json.data?.status?.status === "SUCCESSFUL") {
          setMessage("Payment successful. Your wallet has been credited.");
        } else if (json.data?.status?.status === "PENDING") {
          setMessage("Payment is still processing. Your wallet will update shortly.");
        } else {
          setMessage("Payment received. Refresh your wallet in a moment.");
        }
      })
      .catch(() => {
        setMessage("Payment submitted. Check your wallet for the updated balance.");
      });
  }, [reference, status]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 pt-6 text-center">
          <h1 className="text-xl font-semibold">Wallet deposit</h1>
          <p className="text-sm text-muted-foreground">{message}</p>
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
            <Link href={walletHref}>Back to wallet</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
