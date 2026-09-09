"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export type MerchantPayoutAccount = {
  id: string;
  accountType: string;
  bankName: string;
  bankCode?: string | null;
  accountName: string;
  accountNumberMasked: string;
  isDefault?: boolean;
};

export type FinancingDisbursementRequest = {
  id: string;
  requestedAmount: number;
  approvedAmount?: number | null;
  offeredInterestRate?: number | null;
  durationMonths: number;
  property?: { name: string };
  merchantName?: string | null;
  merchantPayoutAccount?: MerchantPayoutAccount | null;
  payoutProviderLabel?: string | null;
};

type FinancingDisbursementDialogProps = {
  request: FinancingDisbursementRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending?: boolean;
};

function cleanPropertyName(name?: string) {
  return name?.replace(/^\[Demo\]\s*/i, "") ?? "Listing";
}

export function FinancingDisbursementDialog({
  request,
  open,
  onOpenChange,
  onConfirm,
  isPending = false,
}: FinancingDisbursementDialogProps) {
  const { data: paymentConfig } = useQuery({
    queryKey: ["payments-config"],
    queryFn: async () => {
      const res = await fetch("/api/payments/config");
      const json = await res.json();
      return json.data as {
        payoutProviderLabel?: string;
        payoutConfigured?: boolean;
        isDemo?: boolean;
      };
    },
    enabled: open,
  });

  if (!request) return null;

  const amount = Number(request.approvedAmount ?? request.requestedAmount);
  const rate =
    request.offeredInterestRate != null ? Number(request.offeredInterestRate) : null;
  const payout = request.merchantPayoutAccount;
  const providerLabel =
    paymentConfig?.payoutProviderLabel ??
    request.payoutProviderLabel ??
    "Payment provider";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Finance listing</DialogTitle>
          <DialogDescription>
            Confirm payment to the merchant&apos;s verified account via {providerLabel}. Funds
            will leave your lender wallet and be sent directly to the merchant.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm">
            <p className="font-medium text-foreground">
              {cleanPropertyName(request.property?.name)}
            </p>
            {request.merchantName ? (
              <p className="mt-1 text-muted-foreground">Merchant: {request.merchantName}</p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="finance-amount">Amount (GHS)</Label>
              <Input
                id="finance-amount"
                value={amount.toLocaleString()}
                readOnly
                className="mt-1 bg-muted/40"
              />
            </div>
            <div>
              <Label>Interest rate</Label>
              <Input
                value={rate != null ? `${rate}%` : "Category rate"}
                readOnly
                className="mt-1 bg-muted/40"
              />
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-foreground">Merchant payout account</Label>
              <Badge variant="secondary" className="shrink-0">
                {providerLabel}
              </Badge>
            </div>
            {payout ? (
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Account name</dt>
                  <dd className="font-medium">{payout.accountName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Type</dt>
                  <dd className="font-medium">
                    {payout.accountType === "MOMO" ? "Mobile Money" : "Bank account"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Bank / provider</dt>
                  <dd className="font-medium">{payout.bankName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Account number</dt>
                  <dd className="font-medium">{payout.accountNumberMasked}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-amber-800 dark:text-amber-200">
                This merchant has no verified payout account. They must add a bank or MoMo account
                before you can finance this listing.
              </p>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Agent commissions are recorded on the platform ledger and paid when affiliates withdraw.
            Repayment will be collected from the buyer via the active mandate.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={!payout || isPending}
            onClick={onConfirm}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing…
              </>
            ) : (
              `Pay GHS ${amount.toLocaleString()} to merchant`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
