"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function LegacyPaystackReturnPage() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg items-center px-4 py-16">
      <Card className="w-full rounded-none">
        <CardContent className="space-y-4 pt-8 text-center">
          <h1 className="text-xl font-semibold">Payments use Redde now</h1>
          <p className="text-sm text-muted-foreground">
            Paystack checkout is no longer used for collections. Paystack remains available only
            for bank account verification in Settings. Complete payments via Redde (MoMo or bank)
            from pricing, subscriptions, or property checkout.
          </p>
          <Button asChild className="rounded-none bg-emerald-600 hover:bg-emerald-700">
            <Link href="/pricing">Go to pricing</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
