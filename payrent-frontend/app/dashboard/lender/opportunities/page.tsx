"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { FINANCING_STATUS_LABELS, MANDATE_STATUS_LABELS } from "@/constants/platform";
import { formatBuyerIncomeProofPeriodLabel } from "@/lib/financing/income-proof-period";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type LenderFundingRequest = {
  id: string;
  status: string;
  requestedAmount: number;
  durationMonths: number;
  notes?: string | null;
  isTaggedForYou?: boolean;
  tagReason?: string | null;
  property?: {
    name: string;
    location: string;
    monthlyRent: number;
    status?: string;
    landlord?: {
      fullName: string;
      identityVerified?: boolean;
      companyName?: string | null;
    };
  };
  tenant?: {
    fullName: string;
    monthlyIncome: number;
    kycVerified?: boolean;
    user?: { email: string };
  };
  mandate?: { status: string; mandateSource: string };
};

function VerificationChip({
  label,
  verified,
}: {
  label: string;
  verified: boolean;
}) {
  const Icon = verified ? CheckCircle2 : XCircle;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-none border px-2 py-1 text-xs font-medium",
        verified
          ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
          : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {label}
    </span>
  );
}

export default function LenderOpportunitiesPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [interestRate, setInterestRate] = useState("8");
  const [planType, setPlanType] = useState<"MONTHLY" | "DEFERRED" | "CUSTOM">("MONTHLY");

  const { data: requests, isLoading } = useQuery({
    queryKey: ["financing-pending"],
    queryFn: async () => {
      const res = await fetch("/api/financing");
      const json = await res.json();
      return (json.data ?? []) as LenderFundingRequest[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (financingRequestId: string) => {
      const req = requests?.find((r) => r.id === financingRequestId);
      const res = await fetch("/api/financing/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          financingRequestId,
          amount: Number(req?.requestedAmount),
          interestRate: parseFloat(interestRate),
          planType,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
    },
    onSuccess: () => {
      toast.success("Financing offer sent — awaiting customer acceptance");
      queryClient.invalidateQueries({ queryKey: ["financing-pending"] });
      setSelectedId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async (financingRequestId: string) => {
      const res = await fetch("/api/financing/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ financingRequestId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
    },
    onSuccess: () => {
      toast.success("Request rejected");
      queryClient.invalidateQueries({ queryKey: ["financing-pending"] });
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Funding Requests</h1>
      <p className="text-sm text-muted-foreground">
        All Pay-For-Me requests ready for lender review appear here. Requests tagged for you by
        an admin appear first and are highlighted.
      </p>
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !requests?.length ? (
        <p className="text-muted-foreground">No pending requests.</p>
      ) : (
        <Accordion type="multiple" className="space-y-4">
          {requests.map((req) => {
            const buyerVerified = Boolean(req.tenant?.kycVerified);
            const merchantVerified = Boolean(req.property?.landlord?.identityVerified);
            const propertyApproved = req.property?.status === "ACTIVE";
            const incomeProofLabel = formatBuyerIncomeProofPeriodLabel(req.notes);

            return (
              <AccordionItem
                key={req.id}
                value={req.id}
                className={cn(
                  "rounded-none border border-border bg-card px-4 last:border-b",
                  req.isTaggedForYou ? "border-amber-400" : undefined
                )}
              >
                <AccordionTrigger className="py-5 hover:no-underline [&>svg]:mt-1">
                  <div className="flex flex-1 flex-col gap-2 pr-3 text-left">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <p className="text-lg font-semibold text-foreground">
                          {req.property?.name}
                        </p>
                        <p className="text-sm text-muted-foreground">{req.property?.location}</p>
                        {req.isTaggedForYou ? (
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <Badge className="rounded-none bg-amber-500 hover:bg-amber-500">
                              Tagged for you
                            </Badge>
                            {req.tagReason ? (
                              <span className="text-xs text-amber-800 dark:text-amber-300">
                                {req.tagReason}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      <StatusBadge
                        status={req.status}
                        label={FINANCING_STATUS_LABELS[req.status] ?? req.status.replace(/_/g, " ")}
                      />
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="pb-5">
                  <div className="space-y-4 border-t border-border pt-4">
                    <div className="flex flex-wrap gap-2">
                      <VerificationChip label="Buyer verified" verified={buyerVerified} />
                      <VerificationChip label="Merchant verified" verified={merchantVerified} />
                      <VerificationChip label="Property approved" verified={propertyApproved} />
                    </div>

                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      <p>Buyer: {req.tenant?.fullName ?? req.tenant?.user?.email}</p>
                      <p>
                        Buyer income proof period:{" "}
                        <span className="font-medium text-foreground">{incomeProofLabel}</span>
                      </p>
                      <p>Requested: GHS {Number(req.requestedAmount).toLocaleString()}</p>
                      <p>Duration: {req.durationMonths} months</p>
                      <p>
                        Rent: GHS {Number(req.property?.monthlyRent ?? 0).toLocaleString()}/mo
                      </p>
                      <p>
                        Mandate:{" "}
                        {req.mandate ? (
                          <Badge
                            variant={req.mandate.status === "ACTIVE" ? "default" : "secondary"}
                          >
                            {MANDATE_STATUS_LABELS[req.mandate.status] ??
                              req.mandate.status.replace(/_/g, " ")}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">Not set up</span>
                        )}
                      </p>
                    </div>

                    {req.mandate && req.mandate.status !== "ACTIVE" && (
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        Repayment mandate must be active before you can approve funding.
                      </p>
                    )}

                    {selectedId === req.id ? (
                      <div className="flex flex-wrap gap-4 rounded-lg border p-4">
                        <div>
                          <Label>Interest rate (%)</Label>
                          <Input
                            type="number"
                            value={interestRate}
                            onChange={(e) => setInterestRate(e.target.value)}
                            className="w-24"
                          />
                        </div>
                        <div>
                          <Label>Repayment plan</Label>
                          <Select
                            value={planType}
                            onValueChange={(v) => setPlanType(v as typeof planType)}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MONTHLY">Monthly</SelectItem>
                              <SelectItem value="DEFERRED">Deferred</SelectItem>
                              <SelectItem value="CUSTOM">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end gap-2">
                          <Button
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => approveMutation.mutate(req.id)}
                            disabled={approveMutation.isPending}
                          >
                            Confirm approve
                          </Button>
                          <Button variant="ghost" onClick={() => setSelectedId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => setSelectedId(req.id)}
                          disabled={!req.mandate || req.mandate.status !== "ACTIVE"}
                        >
                          Review & Approve
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => rejectMutation.mutate(req.id)}
                          disabled={rejectMutation.isPending}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
