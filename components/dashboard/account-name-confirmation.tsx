"use client";

import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type AccountNameConfirmationProps = {
  accountName: string;
  accountNumber: string;
  providerName: string;
  loading?: boolean;
  error?: string | null;
};

export function AccountNameConfirmation({
  accountName,
  accountNumber,
  providerName,
  loading = false,
  error = null,
}: AccountNameConfirmationProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/60 px-4 py-3">
        <Loader2 className="size-5 shrink-0 animate-spin text-emerald-600" />
        <div>
          <p className="text-sm font-medium text-emerald-900">Verifying account…</p>
          <p className="text-xs text-emerald-700/80">
            Confirming the name registered on this {providerName} account.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <p className="text-sm font-medium text-red-800">Could not verify account</p>
        <p className="mt-1 text-xs text-red-700">{error}</p>
      </div>
    );
  }

  if (!accountName) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white px-4 py-4 shadow-sm"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
          <ShieldCheck className="size-5 text-emerald-700" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-emerald-900">Account verified</p>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <p className="mt-1 truncate text-base font-medium text-slate-900">{accountName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {providerName} · {accountNumber}
          </p>
        </div>
      </div>
    </div>
  );
}
