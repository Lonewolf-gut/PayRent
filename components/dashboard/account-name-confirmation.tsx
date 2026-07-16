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
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3">
        <Loader2 className="size-5 shrink-0 animate-spin text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground">Verifying account…</p>
          <p className="text-xs text-muted-foreground">
            Confirming the name registered on this {providerName} account.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3">
        <p className="text-sm font-medium text-destructive">Could not verify account</p>
        <p className="mt-1 text-xs text-destructive/90">{error}</p>
      </div>
    );
  }

  if (!accountName) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-muted/30 px-4 py-4 shadow-sm"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
          <ShieldCheck className="size-5 text-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">Account verified</p>
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-1 truncate text-base font-medium text-foreground">{accountName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {providerName} · {accountNumber}
          </p>
        </div>
      </div>
    </div>
  );
}
