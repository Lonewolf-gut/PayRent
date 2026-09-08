"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function MerchantDeliveriesPage() {
  const queryClient = useQueryClient();

  const { data: pending, isLoading } = useQuery({
    queryKey: ["merchant-deliveries"],
    queryFn: async () => {
      const res = await fetch("/api/financing/delivery");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (financingRequestId: string) => {
      const res = await fetch("/api/financing/delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ financingRequestId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Confirmation failed");
    },
    onSuccess: () => {
      toast.success("Delivery confirmed — customer repayment schedule is now active");
      queryClient.invalidateQueries({ queryKey: ["merchant-deliveries"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Delivery confirmation</h1>
        <p className="text-muted-foreground">
          Confirm when the customer has received the product or moved in. This activates their
          repayment schedule.
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : !pending?.length ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No financed orders awaiting delivery confirmation.
          </CardContent>
        </Card>
      ) : (
        pending.map((order: {
          id: string;
          approvedAmount: number;
          disbursedAt: string;
          property?: { name: string };
          tenant?: { user?: { email: string; phone?: string } };
        }) => (
          <Card key={order.id}>
            <CardHeader>
              <CardTitle className="text-base">{order.property?.name ?? "Listing"}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                <p>Customer: {order.tenant?.user?.email ?? "—"}</p>
                <p>
                  Financed: GHS {Number(order.approvedAmount).toLocaleString()} · Disbursed{" "}
                  {order.disbursedAt
                    ? new Date(order.disbursedAt).toLocaleDateString()
                    : "recently"}
                </p>
              </div>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={confirmMutation.isPending}
                onClick={() => confirmMutation.mutate(order.id)}
              >
                Confirm delivery
              </Button>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
