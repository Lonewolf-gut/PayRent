"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { StatusBadge } from "@/components/dashboard/status-badge";

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  kind: string;
  status: string;
  amount: number | string;
  paymentMethod?: string | null;
  description?: string | null;
  paidAt?: string | null;
  createdAt: string;
  reddeClientReference?: string | null;
};

export default function BuyerInvoicesPage() {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["payment-invoices"],
    queryFn: async () => {
      const res = await fetch("/api/payments/invoices");
      const json = await res.json();
      return (json.data ?? []) as InvoiceRow[];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payment invoices</h1>
        <p className="text-sm text-muted-foreground">
          Redde collections with invoice numbers for subscriptions and purchases.
        </p>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : !invoices.length ? (
        <p className="text-muted-foreground">No invoices yet.</p>
      ) : (
        <ul className="divide-y rounded-none border">
          {invoices.map((inv) => (
            <li key={inv.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">{inv.invoiceNumber}</p>
                <p className="text-sm text-muted-foreground">
                  {inv.description ?? inv.kind.replace(/_/g, " ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(inv.createdAt).toLocaleString()}
                  {inv.reddeClientReference ? ` · Ref ${inv.reddeClientReference}` : null}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium">
                  GHS {Number(inv.amount).toLocaleString()}
                </span>
                <StatusBadge status={inv.status} label={inv.status.replace(/_/g, " ")} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <Link href="/dashboard/buyer/settings" className="text-sm text-emerald-700 underline">
        Payment accounts in Settings
      </Link>
    </div>
  );
}
