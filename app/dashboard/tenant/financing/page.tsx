"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { FINANCING_STATUS_LABELS } from "@/constants/platform";
import Link from "next/link";

export default function TenantFinancingPage() {
  const queryClient = useQueryClient();

  const { data: kyc } = useQuery({
    queryKey: ["kyc-status"],
    queryFn: async () => {
      const res = await fetch("/api/kyc");
      const json = await res.json();
      return json.data;
    },
  });

  const { data: requests, isLoading } = useQuery({
    queryKey: ["financing"],
    queryFn: async () => {
      const res = await fetch("/api/financing");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const { data: installments } = useQuery({
    queryKey: ["installments"],
    queryFn: async () => {
      const res = await fetch("/api/financing/installments");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const payMutation = useMutation({
    mutationFn: async (installmentId: string) => {
      const res = await fetch("/api/financing/installments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ installmentId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
    },
    onSuccess: () => {
      toast.success("Installment paid");
      queryClient.invalidateQueries({ queryKey: ["installments"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createMandateMutation = useMutation({
    mutationFn: async ({
      financingRequestId,
      bankAccountId,
    }: {
      financingRequestId: string;
      bankAccountId: string;
    }) => {
      const res = await fetch("/api/mandates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          financingRequestId,
          bankAccountId,
          mandateType: "DIRECT_DEBIT",
          mandateSource: "PLATFORM_GENERATED",
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    },
    onSuccess: () => {
      toast.success("Mandate created — submit it from the Mandates page");
      queryClient.invalidateQueries({ queryKey: ["financing"] });
      queryClient.invalidateQueries({ queryKey: ["mandates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Pay for Rent financing</h1>
        <p className="text-muted-foreground">
          Request rent financing after an approved application, complete your mandate, then await lender review.
        </p>
      </div>

      {!kyc?.kycVerified && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
            <p className="text-sm">Complete Ghana Card verification and bank validation before financing.</p>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/tenant/kyc">Complete KYC</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Your requests</h2>
        {isLoading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : !requests?.length ? (
          <p className="text-muted-foreground">No requests yet.</p>
        ) : (
          requests.map((req: {
            id: string;
            status: string;
            requestedAmount: number;
            durationMonths: number;
            property?: { name: string };
          }) => (
            <Card key={req.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{req.property?.name}</CardTitle>
                <StatusBadge status={req.status} label={FINANCING_STATUS_LABELS[req.status]} />
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">
                  GHS {Number(req.requestedAmount).toLocaleString()} · {req.durationMonths} months
                </p>
                {req.status === "MANDATE_PENDING" && kyc?.bankAccounts?.[0]?.id && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={createMandateMutation.isPending}
                    onClick={() =>
                      createMandateMutation.mutate({
                        financingRequestId: req.id,
                        bankAccountId: kyc.bankAccounts[0].id,
                      })
                    }
                  >
                    Create repayment mandate
                  </Button>
                )}
                {req.status === "MANDATE_PENDING" && (
                  <Button asChild size="sm" variant="outline">
                    <Link href="/dashboard/tenant/mandates">Manage mandates</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Repayment schedule</h2>
          <Button asChild variant="link" className="text-emerald-700">
            <Link href="/dashboard/tenant/repayments">View full schedule</Link>
          </Button>
        </div>
        {!installments?.length ? (
          <p className="text-muted-foreground">No active repayment plans.</p>
        ) : (
          installments.map((inst: {
            id: string;
            amount: number;
            dueDate: string;
            status: string;
            propertyName: string;
          }) => (
            <Card key={inst.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
                <div>
                  <p className="font-medium">{inst.propertyName}</p>
                  <p className="text-sm text-muted-foreground">
                    Due {new Date(inst.dueDate).toLocaleDateString()} · GHS{" "}
                    {Number(inst.amount).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={inst.status} />
                  {inst.status === "PENDING" && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      disabled={payMutation.isPending}
                      onClick={() => payMutation.mutate(inst.id)}
                    >
                      Pay now
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
