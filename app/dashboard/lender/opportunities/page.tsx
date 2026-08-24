"use client";

import { useMemo, useState } from "react";
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
import { toast } from "sonner";
import { normalizeLenderQueueResponse } from "@/lib/utils/lender-queue-response";

type FinancingRequest = {
  id: string;
  status: string;
  requestedAmount: number;
  approvedAmount?: number | null;
  offeredInterestRate?: number | null;
  durationMonths: number;
  buyerAcceptedAt?: string | null;
  property?: { name: string; location: string; monthlyRent: number; status?: string };
  tenant?: { fullName: string; monthlyIncome: number; user?: { email: string } };
  mandate?: { status: string } | null;
};

type OfferFormState = {
  interestRate: string;
  planType: "MONTHLY" | "DEFERRED" | "CUSTOM";
};

function PropertyVerifiedBadge({ verified }: { verified?: boolean }) {
  if (!verified) {
    return <Badge variant="secondary">Listing pending verification</Badge>;
  }
  return (
    <Badge className="bg-emerald-700 hover:bg-emerald-700">
      Property verified · safe to invest
    </Badge>
  );
}

export default function LenderOpportunitiesPage() {
  const queryClient = useQueryClient();
  const [offerForms, setOfferForms] = useState<Record<string, OfferFormState>>({});

  const { data: financingRules } = useQuery({
    queryKey: ["financing-rules"],
    queryFn: async () => {
      const res = await fetch("/api/financing/rules");
      const json = await res.json();
      return json.data as { maxInterestRatePercent: number };
    },
  });

  const maxInterestRate = financingRules?.maxInterestRatePercent ?? 30;

  const { data: queueInsight, isLoading } = useQuery({
    queryKey: ["financing-pending"],
    queryFn: async () => {
      const res = await fetch("/api/financing");
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message ?? "Could not load financing queue");
      }
      return normalizeLenderQueueResponse(json.data);
    },
  });

  const requests = (queueInsight?.pending ?? []) as FinancingRequest[];
  const awaitingBuyer = (queueInsight?.awaitingBuyerAcceptance ?? []) as FinancingRequest[];
  const awaitingMandate = (queueInsight?.awaitingMandate ?? []) as FinancingRequest[];
  const readyToFinance = (queueInsight?.readyToFinance ?? []) as FinancingRequest[];

  const getOfferForm = (requestId: string): OfferFormState =>
    offerForms[requestId] ?? { interestRate: "8", planType: "MONTHLY" };

  const updateOfferForm = (requestId: string, patch: Partial<OfferFormState>) => {
    setOfferForms((current) => ({
      ...current,
      [requestId]: { ...getOfferForm(requestId), ...patch },
    }));
  };

  const defaultExpanded = useMemo(() => requests[0]?.id, [requests]);

  const invalidateQueue = () => {
    queryClient.invalidateQueries({ queryKey: ["financing-pending"] });
  };

  const approveMutation = useMutation({
    mutationFn: async ({
      financingRequestId,
      interestRate,
      planType,
    }: {
      financingRequestId: string;
      interestRate: string;
      planType: OfferFormState["planType"];
    }) => {
      const rate = parseFloat(interestRate);
      if (rate > maxInterestRate) {
        throw new Error(
          `Interest rate cannot exceed the platform maximum of ${maxInterestRate}%. Contact admin if you need a higher cap.`
        );
      }
      const req = requests.find((request) => request.id === financingRequestId);
      const res = await fetch("/api/financing/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          financingRequestId,
          amount: Number(req?.requestedAmount),
          interestRate: rate,
          planType,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? json.error?.message);
    },
    onSuccess: () => {
      toast.success("Financing offer sent — awaiting customer acceptance");
      invalidateQueue();
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
      if (!json.success) throw new Error(json.message ?? json.error?.message);
    },
    onSuccess: () => {
      toast.success("Request rejected");
      invalidateQueue();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disburseMutation = useMutation({
    mutationFn: async (financingRequestId: string) => {
      const res = await fetch("/api/financing/disburse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ financingRequestId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? json.error?.message);
    },
    onSuccess: () => {
      toast.success("Financing disbursed to merchant");
      invalidateQueue();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const hasAnyQueueItems =
    requests.length > 0 ||
    awaitingBuyer.length > 0 ||
    awaitingMandate.length > 0 ||
    readyToFinance.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Listings awaiting financing</h1>
        <p className="text-muted-foreground">
          Send a financing offer first. After the customer accepts and the mandate is active, finance
          the listing from your wallet.
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <>
          {readyToFinance.length > 0 ? (
            <QueueSection
              title="Ready to finance"
              description="The customer accepted your offer and the repayment mandate is active. Top up your wallet if needed, then disburse funds."
            >
              {readyToFinance.map((req) => (
                <OfferSummaryCard
                  key={req.id}
                  req={req}
                  badge={
                    <Badge className="bg-emerald-700 hover:bg-emerald-700">
                      Mandate active · ready to finance
                    </Badge>
                  }
                  actions={
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700"
                      disabled={disburseMutation.isPending}
                      onClick={() => disburseMutation.mutate(req.id)}
                    >
                      Finance listing
                    </Button>
                  }
                />
              ))}
            </QueueSection>
          ) : null}

          {awaitingMandate.length > 0 ? (
            <QueueSection
              title="Awaiting mandate activation"
              description="The customer accepted your offer. Funds can be disbursed once the bank activates the repayment mandate."
            >
              {awaitingMandate.map((req) => (
                <OfferSummaryCard
                  key={req.id}
                  req={req}
                  badge={
                    <Badge variant="secondary">
                      Customer accepted · mandate {req.mandate?.status?.toLowerCase() ?? "pending"}
                    </Badge>
                  }
                />
              ))}
            </QueueSection>
          ) : null}

          {awaitingBuyer.length > 0 ? (
            <QueueSection
              title="Awaiting customer acceptance"
              description="You sent these offers. The customer must review and accept before the mandate is created."
            >
              {awaitingBuyer.map((req) => (
                <OfferSummaryCard
                  key={req.id}
                  req={req}
                  badge={<Badge variant="secondary">Offer sent · awaiting customer</Badge>}
                />
              ))}
            </QueueSection>
          ) : null}

          {requests.length > 0 ? (
            <QueueSection
              title="New financing requests"
              description="Review verified listings and send a financing offer with your interest rate."
            >
              <Accordion
                type="single"
                collapsible
                defaultValue={defaultExpanded}
                className="divide-y divide-border rounded-xl border border-border bg-card"
              >
                {requests.map((req) => {
                  const offer = getOfferForm(req.id);
                  const propertyName =
                    req.property?.name?.replace(/^\[Demo\]\s*/i, "") ?? "Listing";

                  return (
                    <AccordionItem key={req.id} value={req.id} className="border-0 px-4">
                      <AccordionTrigger className="py-4 hover:no-underline">
                        <div className="flex flex-1 flex-col gap-3 pr-2 text-left lg:flex-row lg:items-center lg:justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold text-foreground">
                              {propertyName}
                            </p>
                            <p className="truncate text-sm text-muted-foreground">
                              {req.property?.location}
                            </p>
                            <p className="mt-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                              GHS {Number(req.requestedAmount).toLocaleString()} ·{" "}
                              {req.durationMonths} months
                            </p>
                          </div>
                          <PropertyVerifiedBadge verified={req.property?.status === "ACTIVE"} />
                        </div>
                      </AccordionTrigger>

                      <AccordionContent className="pb-4">
                        <div className="space-y-4">
                          <RequestDetails req={req} />

                          <div className="rounded-xl border border-border p-4">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                              <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                  <Label htmlFor={`rate-${req.id}`}>Interest rate (%)</Label>
                                  <Input
                                    id={`rate-${req.id}`}
                                    type="number"
                                    min={0}
                                    max={maxInterestRate}
                                    value={offer.interestRate}
                                    onChange={(e) =>
                                      updateOfferForm(req.id, { interestRate: e.target.value })
                                    }
                                    className="w-full sm:w-28"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label htmlFor={`plan-${req.id}`}>Repayment plan</Label>
                                  <Select
                                    value={offer.planType}
                                    onValueChange={(value) =>
                                      updateOfferForm(req.id, {
                                        planType: value as OfferFormState["planType"],
                                      })
                                    }
                                  >
                                    <SelectTrigger id={`plan-${req.id}`} className="w-full sm:w-40">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                                      <SelectItem value="DEFERRED">Deferred</SelectItem>
                                      <SelectItem value="CUSTOM">Custom</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <Button
                                  className="bg-emerald-600 hover:bg-emerald-700"
                                  disabled={approveMutation.isPending}
                                  onClick={() =>
                                    approveMutation.mutate({
                                      financingRequestId: req.id,
                                      interestRate: offer.interestRate,
                                      planType: offer.planType,
                                    })
                                  }
                                >
                                  Send financing offer
                                </Button>
                                <Button
                                  variant="outline"
                                  disabled={rejectMutation.isPending}
                                  onClick={() => rejectMutation.mutate(req.id)}
                                >
                                  Reject
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </QueueSection>
          ) : null}

          {!hasAnyQueueItems ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
              <p>No listings awaiting financing right now.</p>
              <p className="mt-2 text-sm">
                Requests appear here after the merchant and admin have approved them.
              </p>
              {(queueInsight?.waitingOnMerchant ?? 0) > 0 ||
              (queueInsight?.waitingOnAdminDocs ?? 0) > 0 ||
              (queueInsight?.waitingOnAdminEligibility ?? 0) > 0 ? (
                <ul className="mx-auto mt-4 max-w-md space-y-1 text-left text-sm">
                  {(queueInsight?.waitingOnMerchant ?? 0) > 0 ? (
                    <li>
                      • {queueInsight?.waitingOnMerchant} waiting on{" "}
                      <span className="font-medium text-foreground">merchant approval</span>
                    </li>
                  ) : null}
                  {(queueInsight?.waitingOnAdminDocs ?? 0) > 0 ? (
                    <li>
                      • {queueInsight?.waitingOnAdminDocs} waiting on{" "}
                      <span className="font-medium text-foreground">admin document review</span>
                    </li>
                  ) : null}
                  {(queueInsight?.waitingOnAdminEligibility ?? 0) > 0 ? (
                    <li>
                      • {queueInsight?.waitingOnAdminEligibility} waiting on{" "}
                      <span className="font-medium text-foreground">admin eligibility review</span>
                      — approve them in Admin → Financing before they reach you
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function QueueSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function OfferSummaryCard({
  req,
  badge,
  actions,
}: {
  req: FinancingRequest;
  badge: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const propertyName = req.property?.name?.replace(/^\[Demo\]\s*/i, "") ?? "Listing";
  const amount = Number(req.approvedAmount ?? req.requestedAmount);
  const rate = req.offeredInterestRate != null ? Number(req.offeredInterestRate) : null;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-foreground">{propertyName}</p>
            {badge}
          </div>
          <p className="text-sm text-muted-foreground">{req.property?.location}</p>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            GHS {amount.toLocaleString()}
            {rate != null ? ` · ${rate}%` : ""} · {req.durationMonths} months
          </p>
          <RequestDetails req={req} compact />
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

function RequestDetails({ req, compact = false }: { req: FinancingRequest; compact?: boolean }) {
  return (
    <dl
      className={`grid gap-3 text-sm ${compact ? "sm:grid-cols-2" : "rounded-xl border border-border bg-muted/10 p-4 sm:grid-cols-2"}`}
    >
      <Detail
        label="Buyer"
        value={req.tenant?.fullName ?? req.tenant?.user?.email ?? "—"}
      />
      {!compact ? (
        <Detail
          label="Income"
          value={`GHS ${Number(req.tenant?.monthlyIncome ?? 0).toLocaleString()}`}
        />
      ) : null}
      <Detail label="Requested" value={`GHS ${Number(req.requestedAmount).toLocaleString()}`} />
      <Detail label="Duration" value={`${req.durationMonths} months`} />
      {!compact ? (
        <Detail
          label="Rent"
          value={`GHS ${Number(req.property?.monthlyRent ?? 0).toLocaleString()}/mo`}
        />
      ) : null}
    </dl>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
    </div>
  );
}
