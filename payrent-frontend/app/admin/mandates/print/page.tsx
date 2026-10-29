"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { isCbgBankAccount } from "@/lib/constants/bank-partners";

type PrintPack = {
  id: string;
  status: string;
  providerName?: string | null;
  submittedAt?: string | null;
  tenant?: {
    fullName?: string | null;
    user?: { email?: string; phone?: string | null };
  };
  bankAccount?: {
    bankName: string;
    bankCode?: string | null;
    accountName: string;
    accountNumberMasked?: string | null;
  };
  financingRequest?: {
    requestedAmount: number | string;
    durationMonths: number;
    repaymentPreference?: string | null;
    property?: { name?: string; location?: string | null };
  };
};

export default function AdminMandatePrintPage() {
  const params = useSearchParams();
  const mandateId = params.get("id") ?? "";

  const { data, isLoading, error } = useQuery({
    queryKey: ["mandate-print", mandateId],
    enabled: Boolean(mandateId),
    queryFn: async () => {
      const res = await fetch(`/api/mandates/${mandateId}/print-pack`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Could not load mandate");
      return json.data as PrintPack;
    },
  });

  const manualBank =
    data?.providerName === "manual-bank" ||
    (data?.bankAccount && !isCbgBankAccount(data.bankAccount.bankCode, data.bankAccount.bankName));

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8 print:p-4">
      <div className="flex items-center justify-between gap-4 print:hidden">
        <Button variant="outline" onClick={() => window.history.back()}>
          Back
        </Button>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => window.print()}>
          Print
        </Button>
      </div>

      {isLoading ? <p>Loading…</p> : null}
      {error ? <p className="text-red-600">{(error as Error).message}</p> : null}

      {data ? (
        <article className="space-y-6 border p-8 text-sm print:border-0 print:p-0">
          <header className="space-y-1 border-b pb-4">
            <h1 className="text-xl font-bold">PayForMe — Bank debit mandate request</h1>
            <p className="text-muted-foreground">
              {manualBank
                ? "Manual processing — print and deliver to the customer’s bank"
                : "CBG integrated mandate"}
            </p>
            <p>Mandate reference: {data.id}</p>
            <p>Date: {new Date(data.submittedAt ?? Date.now()).toLocaleDateString("en-GH")}</p>
          </header>

          <section>
            <h2 className="mb-2 font-semibold">Customer</h2>
            <p>Name: {data.tenant?.fullName ?? "—"}</p>
            <p>Email: {data.tenant?.user?.email ?? "—"}</p>
            <p>Phone: {data.tenant?.user?.phone ?? "—"}</p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold">Debit account</h2>
            <p>Bank: {data.bankAccount?.bankName ?? "—"}</p>
            <p>Account name: {data.bankAccount?.accountName ?? "—"}</p>
            <p>Account number: {data.bankAccount?.accountNumberMasked ?? "—"}</p>
          </section>

          <section>
            <h2 className="mb-2 font-semibold">Pay-for-me financing</h2>
            <p>Listing: {data.financingRequest?.property?.name ?? "—"}</p>
            <p>Location: {data.financingRequest?.property?.location ?? "—"}</p>
            <p>
              Amount: GHS{" "}
              {Number(data.financingRequest?.requestedAmount ?? 0).toLocaleString()}
            </p>
            <p>Term: {data.financingRequest?.durationMonths ?? "—"} months</p>
            <p>Repayment preference: {data.financingRequest?.repaymentPreference ?? "Monthly debit"}</p>
          </section>

          <section className="space-y-2 border-t pt-4">
            <h2 className="font-semibold">Bank action requested</h2>
            <p>
              Set up a recurring monthly direct debit from the account above for the PayForMe
              repayment schedule, per the customer&apos;s signed authorization on the PayForMe platform.
            </p>
            {manualBank ? (
              <p className="font-medium">
                Admin: after the bank confirms setup, mark the mandate as approved in PayForMe Admin
                → Mandates.
              </p>
            ) : null}
          </section>

          <footer className="border-t pt-4 text-xs text-muted-foreground">
            PayForMe · Generated for bank processing · Status: {data.status}
          </footer>
        </article>
      ) : null}
    </div>
  );
}
