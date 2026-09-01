"use client";

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

function cleanPropertyName(name?: string) {
  return name?.replace(/^\[Demo\]\s*/i, "") ?? "Listing";
}

function mergeAcceptedOffers(
  readyToFinance: FinancingRequest[],
  awaitingMandate: FinancingRequest[]
) {
  const seen = new Set<string>();
  return [...readyToFinance, ...awaitingMandate].filter((request) => {
    if (seen.has(request.id)) return false;
    seen.add(request.id);
    return true;
  });
}

export default function LenderOpportunitiesPage() {
  const queryClient = useQueryClient();

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
  const acceptedOffers = useMemo(
    () => mergeAcceptedOffers(readyToFinance, awaitingMandate),
    [readyToFinance, awaitingMandate]
  );

  const invalidateQueue = () => {
    queryClient.invalidateQueries({ queryKey: ["financing-pending"] });
  };

  const financeMutation = useMutation({
    mutationFn: async (financingRequestId: string) => {
      const req = requests.find((request) => request.id === financingRequestId);
      const res = await fetch("/api/financing/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          financingRequestId,
          amount: Number(req?.requestedAmount),
          planType: "MONTHLY",
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? json.error?.message);
    },
    onSuccess: () => {
      toast.success("Financing approved — mandate processing started");
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
    acceptedOffers.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Listings awaiting financing</h1>
        <p className="text-muted-foreground">
          Finance listings at the platform category rate, or reject requests that do not fit your
          portfolio. After mandate activation, disburse funds from your wallet.
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <>
          {acceptedOffers.length > 0 ? (
            <QueueSection
              title="Ready to finance"
              description="Mandate is in progress or active. Top up your lender wallet if needed, then click Finance listing to pay the merchant."
            >
              <FinancingQueueAccordion
                items={acceptedOffers}
                renderBadge={(req) =>
                  req.mandate?.status === "ACTIVE" ? (
                    <Badge className="bg-emerald-700 hover:bg-emerald-700">
                      Mandate active
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      Mandate{" "}
                      {req.mandate?.status?.toLowerCase().replace(/_/g, " ") ?? "pending"}
                    </Badge>
                  )
                }
                renderActions={(req) => (
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700"
                    disabled={disburseMutation.isPending}
                    onClick={() => disburseMutation.mutate(req.id)}
                  >
                    Finance listing
                  </Button>
                )}
              />
            </QueueSection>
          ) : null}

          {awaitingBuyer.length > 0 ? (
            <QueueSection
              title="Awaiting mandate setup"
              description="You approved these requests. The customer must complete repayment mandate setup before you can finance."
            >
              <FinancingQueueAccordion
                items={awaitingBuyer}
                renderBadge={() => (
                  <Badge variant="secondary">Approved · awaiting mandate</Badge>
                )}
              />
            </QueueSection>
          ) : null}

          {requests.length > 0 ? (
            <QueueSection
              title="New financing requests"
              description="Review verified listings and approve financing at the platform category interest rate."
            >
              <Accordion
                type="single"
                collapsible
                className="divide-y divide-border rounded-xl border border-border bg-card"
              >
                {requests.map((req) => {
                  const propertyName = cleanPropertyName(req.property?.name);

                  return (
                    <AccordionItem key={req.id} value={req.id} className="border-0 px-4">
                      <AccordionTrigger className="py-4 hover:no-underline">
                        <ListingAccordionSummary req={req} propertyName={propertyName} />
                      </AccordionTrigger>

                      <AccordionContent className="pb-4">
                        <div className="space-y-4">
                          <RequestDetails req={req} />

                          <div className="flex flex-wrap justify-end gap-2 rounded-xl border border-border p-4">
                            <Button
                              className="bg-emerald-600 hover:bg-emerald-700"
                              disabled={financeMutation.isPending}
                              onClick={() => financeMutation.mutate(req.id)}
                            >
                              Finance
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
      {children}
    </section>
  );
}

function FinancingQueueAccordion({
  items,
  renderBadge,
  renderActions,
}: {
  items: FinancingRequest[];
  renderBadge: (req: FinancingRequest) => React.ReactNode;
  renderActions?: (req: FinancingRequest) => React.ReactNode;
}) {
  return (
    <Accordion type="single" collapsible className="divide-y divide-border rounded-xl border border-border bg-card">
      {items.map((req) => {
        const propertyName = cleanPropertyName(req.property?.name);
        const amount = Number(req.approvedAmount ?? req.requestedAmount);
        const rate = req.offeredInterestRate != null ? Number(req.offeredInterestRate) : null;

        return (
          <AccordionItem key={req.id} value={req.id} className="border-0">
            <div className="flex items-start gap-2 px-4">
              <AccordionTrigger className="flex-1 py-4 hover:no-underline">
                <div className="flex flex-1 flex-col gap-3 pr-2 text-left lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-base font-semibold text-foreground">
                        {propertyName}
                      </p>
                      {renderBadge(req)}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{req.property?.location}</p>
                    <p className="mt-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      GHS {amount.toLocaleString()}
                      {rate != null ? ` · ${rate}%` : ""} · {req.durationMonths} months
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              {renderActions ? (
                <div className="shrink-0 py-4" onClick={(event) => event.stopPropagation()}>
                  {renderActions(req)}
                </div>
              ) : null}
            </div>

            <AccordionContent className="px-4 pb-4">
              <div className="space-y-4">
                <RequestDetails req={req} />
                {renderActions ? (
                  <div className="flex flex-wrap gap-2 sm:hidden">{renderActions(req)}</div>
                ) : null}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

function ListingAccordionSummary({
  req,
  propertyName,
}: {
  req: FinancingRequest;
  propertyName: string;
}) {
  return (
    <div className="flex flex-1 flex-col gap-3 pr-2 text-left lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <p className="truncate text-base font-semibold text-foreground">{propertyName}</p>
        <p className="truncate text-sm text-muted-foreground">{req.property?.location}</p>
        <p className="mt-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
          GHS {Number(req.requestedAmount).toLocaleString()} · {req.durationMonths} months
        </p>
      </div>
      <PropertyVerifiedBadge verified={req.property?.status === "ACTIVE"} />
    </div>
  );
}

function RequestDetails({ req }: { req: FinancingRequest }) {
  return (
    <dl className="grid gap-3 rounded-xl border border-border bg-muted/10 p-4 text-sm sm:grid-cols-2">
      <Detail label="Buyer" value={req.tenant?.fullName ?? req.tenant?.user?.email ?? "—"} />
      <Detail
        label="Income"
        value={`GHS ${Number(req.tenant?.monthlyIncome ?? 0).toLocaleString()}`}
      />
      <Detail label="Requested" value={`GHS ${Number(req.requestedAmount).toLocaleString()}`} />
      <Detail label="Duration" value={`${req.durationMonths} months`} />
      <Detail
        label="Rent"
        value={`GHS ${Number(req.property?.monthlyRent ?? 0).toLocaleString()}/mo`}
      />
      {req.buyerAcceptedAt ? (
        <Detail
          label="Accepted on"
          value={new Date(req.buyerAcceptedAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        />
      ) : null}
      {req.mandate?.status ? (
        <Detail
          label="Mandate status"
          value={req.mandate.status.replace(/_/g, " ").toLowerCase()}
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
