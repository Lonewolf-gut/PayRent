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

const SETTINGS_PATH: Partial<Record<UserRole, string>> = {
  BUYER: "/dashboard/buyer/settings",
  MERCHANT: "/dashboard/merchant/settings",
  LENDER: "/dashboard/lender/settings",
  MARKETER: "/dashboard/marketer/settings",
  ADMIN: "/admin/settings",
};

export default function PaystackPaymentReturnPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");
  const [message, setMessage] = useState("Checking payment status…");
  const [kind, setKind] = useState<"wallet" | "subscription" | "unknown">("unknown");

  const role = session?.user?.role as UserRole | undefined;
  const backHref =
    kind === "subscription"
      ? (role ? (SETTINGS_PATH[role] ?? "/") : "/")
      : role
        ? (WALLET_PATH[role] ?? "/")
        : "/";

  useEffect(() => {
    if (!reference) {
      setMessage("Payment completed. Return to your dashboard to see updates.");
      return;
    }

    fetch(`/api/payments/paystack/complete?reference=${encodeURIComponent(reference)}`)
      .then((res) => res.json())
      .then((json) => {
        const result = json.data?.result;
        if (result && "subscription" in result) setKind("subscription");

        if (json.data?.completed && "subscription" in (result ?? {})) {
          setMessage("Payment successful. Your Premium subscription is now active.");
        } else if (json.data?.completed) {
          setMessage("Payment successful. Your wallet has been credited.");
        } else if (json.data?.status === "PENDING") {
          setMessage("Payment is still processing. Your account will update shortly.");
        } else {
          setMessage("Payment received. Refresh your dashboard in a moment.");
        }
      })
      .catch(() => {
        setMessage("Payment submitted. Check your dashboard for the updated status.");
      });
  }, [reference]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 pt-6 text-center">
          <h1 className="text-xl font-semibold">
            {kind === "subscription" ? "Subscription payment" : "Payment complete"}
          </h1>
          <p className="text-sm text-muted-foreground">{message}</p>
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
            <Link href={backHref}>
              {kind === "subscription" ? "Back to settings" : "Back to wallet"}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
