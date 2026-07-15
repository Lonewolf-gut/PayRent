"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { FINANCING_STATUS_LABELS, MANDATE_STATUS_LABELS } from "@/constants/platform";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type BankAccount = {
  id: string;
  bankName: string;
  accountNumberMasked?: string;
  isVerified: boolean;
};

export default function TenantFinancingPage() {
  const queryClient = useQueryClient();
  const [mandateSource, setMandateSource] = useState<"PLATFORM_GENERATED" | "SCANNED_UPLOAD">(
    "PLATFORM_GENERATED"
  );
  const [selectedBankId, setSelectedBankId] = useState<string>("");

  const { data: kyc } = useQuery({
    queryKey: ["kyc-status"],
    queryFn: async () => {
      const res = await fetch("/api/kyc");
      const json = await res.json();
      return json.data as { kycVerified?: boolean; bankAccounts?: BankAccount[] };
    },
  });

  const verifiedAccounts = (kyc?.bankAccounts ?? []).filter((a) => a.isVerified);
  const bankAccountId = selectedBankId || verifiedAccounts[0]?.id;

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

  const acceptMutation = useMutation({
    mutationFn: async (financingRequestId: string) => {
      const res = await fetch("/api/financing/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ financingRequestId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Acceptance failed");
    },
    onSuccess: () => {
      toast.success("Financing terms accepted — payment sent to merchant");
      queryClient.invalidateQueries({ queryKey: ["financing"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createMandateMutation = useMutation({
    mutationFn: async ({
      financingRequestId,
      bankAccountId: accountId,
      source,
    }: {
      financingRequestId: string;
      bankAccountId: string;
      source: "PLATFORM_GENERATED" | "SCANNED_UPLOAD";
    }) => {
      const res = await fetch("/api/mandates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          financingRequestId,
          bankAccountId: accountId,
          mandateType: "DIRECT_DEBIT",
          mandateSource: source,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    },
    onSuccess: () => {
      toast.success("Mandate created — complete it on the Mandates page");
      queryClient.invalidateQueries({ queryKey: ["financing"] });
      queryClient.invalidateQueries({ queryKey: ["mandates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Pay-for-Me financing</h1>
        <p className="text-muted-foreground">
          Track eligibility, mandate setup, lender offers, delivery, and repayments.
        </p>
      </div>

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
            approvedAmount?: number;
            durationMonths: number;
            riskCategory?: string;
            eligibilityScore?: number;
            offeredInterestRate?: number;
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
                {req.riskCategory ? (
                  <p className="text-sm text-muted-foreground">
                    Eligibility: {req.riskCategory}
                    {req.eligibilityScore != null ? ` (score ${req.eligibilityScore})` : ""}
                  </p>
                ) : null}
                {req.status === "ELIGIBILITY_PENDING" && (
                  <p className="text-sm text-amber-700">
                    Your request is being reviewed for eligibility. You will be notified when you can
                    set up your repayment mandate.
                  </p>
                )}
                {req.status === "MANDATE_PENDING" && bankAccountId && (
                  <div className="space-y-3 rounded-lg border p-4">
                    <div>
                      <Label>Mandate type</Label>
                      <Select
                        value={mandateSource}
                        onValueChange={(v) =>
                          setMandateSource(v as "PLATFORM_GENERATED" | "SCANNED_UPLOAD")
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PLATFORM_GENERATED">
                            Platform-generated (electronic)
                          </SelectItem>
                          <SelectItem value="SCANNED_UPLOAD">
                            Scanned upload (signed bank form)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {verifiedAccounts.length > 1 && (
                      <div>
                        <Label>Bank account</Label>
                        <Select
                          value={bankAccountId}
                          onValueChange={(value) => setSelectedBankId(value ?? "")}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {verifiedAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.bankName} · {account.accountNumberMasked}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      disabled={createMandateMutation.isPending}
                      onClick={() =>
                        createMandateMutation.mutate({
                          financingRequestId: req.id,
                          bankAccountId,
                          source: mandateSource,
                        })
                      }
                    >
                      Create repayment mandate
                    </Button>
                  </div>
                )}
                {req.status === "READY_FOR_LENDER_REVIEW" && (
                  <p className="text-sm text-muted-foreground">
                    Mandate active. A lender is reviewing your request.
                  </p>
                )}
                {req.status === "APPROVED" && (
                  <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-sm">
                      Lender offer: GHS {Number(req.approvedAmount ?? req.requestedAmount).toLocaleString()}
                      {req.offeredInterestRate != null
                        ? ` at ${Number(req.offeredInterestRate)}% interest`
                        : ""}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Review the fee disclosure and accept the terms to authorize payment to the
                      merchant.
                    </p>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      disabled={acceptMutation.isPending}
                      onClick={() => acceptMutation.mutate(req.id)}
                    >
                      Accept financing terms
                    </Button>
                  </div>
                )}
                {req.status === "DISBURSED" && (
                  <p className="text-sm text-muted-foreground">
                    Payment has been sent to the merchant. Repayments will begin once delivery is
                    confirmed.
                  </p>
                )}
                {req.status === "MANDATE_PENDING" && !bankAccountId && (
                  <p className="text-sm text-amber-700">
                    Add and validate a bank account in Wallet before creating a mandate.
                  </p>
                )}
                {req.status === "MANDATE_PENDING" && (
                  <Button asChild size="sm" variant="outline">
                    <Link href="/dashboard/buyer/mandates">Manage mandates</Link>
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
            <Link href="/dashboard/buyer/repayments">View full schedule</Link>
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
                  {["PENDING", "PARTIAL", "OVERDUE"].includes(inst.status) && (
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
