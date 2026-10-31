"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Wallet, CreditCard, MessageSquare, ShieldAlert, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { FinancingRequestDialog } from "@/components/financing/financing-request-dialog";
import { APPLICATION_STATUS_LABELS } from "@/constants/platform";
import { toast } from "sonner";

type BankAccount = {
  id: string;
  accountType?: string;
  bankName: string;
  accountNumberMasked?: string | null;
  isVerified: boolean;
};

type PropertyActionPanelProps = {
  propertyId: string;
  propertyName: string;
  isSale: boolean;
  purchasePrice: number;
  walletBalance: number;
  monthlyRent: number;
  annualRent?: number;
  propertyStatus: string;
  fullyVerified: boolean;
  approvedApplication?: {
    id: string;
    propertyId?: string;
    financingRequests?: { id: string; status?: string }[];
  } | null;
  propertyApplication?: {
    id: string;
    status: string;
    financingRequests?: { id: string }[];
  } | null;
  moveInDate: string;
  setMoveInDate: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  onDepositPrompt: () => void;
  onChat: (recipientUserId: string, label: string) => void;
  contacts: {
    landlord?: { userId: string; name: string } | null;
    agent?: { userId: string | null; name: string } | null;
  };
};

export function PropertyActionPanel({
  propertyId,
  propertyName,
  isSale,
  purchasePrice,
  walletBalance,
  monthlyRent,
  annualRent,
  propertyStatus,
  fullyVerified,
  approvedApplication,
  propertyApplication,
  moveInDate,
  setMoveInDate,
  notes,
  setNotes,
  onDepositPrompt,
  onChat,
  contacts,
}: PropertyActionPanelProps) {
  const router = useRouter();
  const [financingOpen, setFinancingOpen] = useState(false);
  const [payAccountId, setPayAccountId] = useState("");

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["settings-bank-accounts"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      const json = await res.json();
      return (json.data?.bankAccounts ?? []) as BankAccount[];
    },
  });

  const verifiedPayAccounts = bankAccounts.filter((a) => a.isVerified);

  const defaultFinancingAmount =
    annualRent && annualRent > 0 ? annualRent : monthlyRent > 0 ? monthlyRent * 12 : 0;

  const applyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          requestedMoveInDate: moveInDate ? new Date(moveInDate).toISOString() : undefined,
          notes: notes || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? json.errors?.[0]?.message);
    },
    onSuccess: () => {
      toast.success("Application submitted");
      router.push("/dashboard/buyer/applications");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      if (!payAccountId) throw new Error("Select a payment account");
      const res = await fetch(`/api/properties/${propertyId}/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankAccountId: payAccountId }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message ?? json.data?.error ?? "Purchase failed");
      }
      return json.data?.checkout as { invoiceNumber?: string; reference?: string; message?: string };
    },
    onSuccess: (checkout) => {
      toast.success(
        checkout?.invoiceNumber
          ? `Invoice ${checkout.invoiceNumber}: complete Redde payment to finish purchase.`
          : "Redde payment started — complete the prompt to finish purchase."
      );
      router.refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rentPaymentMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/properties/${propertyId}/rent-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: approvedApplication?.id,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        if (json.data?.code === "INSUFFICIENT_FUNDS") {
          onDepositPrompt();
          throw new Error("Insufficient wallet balance");
        }
        throw new Error(json.message ?? json.data?.error ?? "Payment failed");
      }
      return json.data;
    },
    onSuccess: () => {
      toast.success("Rent payment completed successfully");
      router.refresh();
    },
    onError: (e: Error) => {
      if (e.message !== "Insufficient wallet balance") toast.error(e.message);
    },
  });

  const payAmount = isSale ? purchasePrice : monthlyRent;
  const canPayRent = walletBalance >= payAmount;
  const hasFinancingRequest = Boolean(approvedApplication?.financingRequests?.length);

  return (
    <div className="space-y-4">
      {propertyStatus === "ACTIVE" ? (
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="size-5" />
              {isSale ? "Buy with Redde" : "Pay for this property"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSale ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Pay GHS {purchasePrice.toLocaleString()} via Redde (Mobile Money or bank). Funds
                  settle to the merchant per your Redde configuration. You receive a numbered
                  invoice.
                </p>
                {!verifiedPayAccounts.length ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                    Add a verified MoMo or bank account in Settings to pay.
                    <div className="mt-3">
                      <Button asChild variant="outline" className="rounded-none">
                        <Link href="/dashboard/buyer/settings">Go to Settings</Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {verifiedPayAccounts.map((account) => (
                      <label
                        key={account.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                          payAccountId === account.id ? "border-emerald-500 bg-emerald-50/50" : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="payAccountId"
                          checked={payAccountId === account.id}
                          onChange={() => setPayAccountId(account.id)}
                          className="mt-1"
                        />
                        <div>
                          <p className="flex items-center gap-2 text-sm font-medium">
                            <Smartphone className="size-4" />
                            {account.bankName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {account.accountNumberMasked ?? account.accountType}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                <Button
                  className="w-full rounded-none bg-emerald-600 hover:bg-emerald-700"
                  disabled={purchaseMutation.isPending || !payAccountId}
                  onClick={() => purchaseMutation.mutate()}
                >
                  {purchaseMutation.isPending ? "Starting payment…" : "Pay with Redde"}
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Pay GHS {monthlyRent.toLocaleString()} rent from your wallet.
                </p>
                <p className="text-sm">
                  Balance:{" "}
                  <span className="font-semibold text-emerald-700">
                    GHS {walletBalance.toLocaleString()}
                  </span>
                </p>
                <Button
                  className="w-full rounded-none bg-emerald-600 hover:bg-emerald-700"
                  disabled={rentPaymentMutation.isPending}
                  onClick={() => rentPaymentMutation.mutate()}
                >
                  {rentPaymentMutation.isPending ? "Processing..." : "Pay now"}
                </Button>
                {!canPayRent ? (
                  <Button variant="outline" className="w-full rounded-none" onClick={onDepositPrompt}>
                    Deposit funds
                  </Button>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      ) : null}

      {!isSale ? (
        <>
          <Card className="rounded-none border-amber-500/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="size-5 text-amber-600" />
                Request for financing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!fullyVerified ? (
                <div className="space-y-3 border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <p className="text-foreground">
                      Complete verification before requesting pay-for-me financing.
                    </p>
                  </div>
                  <Button className="w-full rounded-none" asChild>
                    <Link href="/dashboard/buyer/kyc">Complete verification</Link>
                  </Button>
                </div>
              ) : hasFinancingRequest ? (
                <div className="space-y-3">
                  <StatusBadge status="APPROVED" label="Request submitted" />
                  <p className="text-sm text-muted-foreground">
                    Track admin, merchant, and lender approval from your applications dashboard.
                  </p>
                  <Button className="w-full rounded-none bg-amber-500 hover:bg-amber-600" asChild>
                    <Link href="/dashboard/buyer/applications">View progress</Link>
                  </Button>
                  <Button className="w-full rounded-none" variant="outline" asChild>
                    <Link href="/dashboard/buyer/mandates">Mandate workspace</Link>
                  </Button>
                </div>
              ) : approvedApplication ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Your application is approved. Request pay-for-me financing for this listing.
                  </p>
                  <Button
                    className="w-full rounded-none bg-amber-500 hover:bg-amber-600"
                    onClick={() => setFinancingOpen(true)}
                  >
                    Request financing
                  </Button>
                </div>
              ) : propertyApplication && propertyApplication.status !== "APPROVED" ? (
                <div className="space-y-2">
                  <StatusBadge
                    status={propertyApplication.status}
                    label={
                      APPLICATION_STATUS_LABELS[propertyApplication.status] ??
                      propertyApplication.status
                    }
                  />
                  <p className="text-sm text-muted-foreground">
                    Financing unlocks once the merchant approves your application for this listing.
                  </p>
                  <Button className="w-full rounded-none" variant="outline" asChild>
                    <Link href="/dashboard/buyer/applications">View application status</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Submit an application for this property first. Once approved, you can request
                    pay-for-me financing here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-none">
            <CardHeader>
              <CardTitle>Apply for this property</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Preferred move-in date</Label>
                <Input
                  type="date"
                  className="rounded-none"
                  value={moveInDate}
                  onChange={(e) => setMoveInDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Input
                  className="rounded-none"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Tell the merchant about yourself"
                />
              </div>
              <Button
                className="w-full rounded-none"
                variant="outline"
                disabled={
                  applyMutation.isPending ||
                  propertyApplication?.status === "APPROVED" ||
                  propertyApplication?.status === "SUBMITTED" ||
                  propertyApplication?.status === "UNDER_REVIEW"
                }
                onClick={() => applyMutation.mutate()}
              >
                {propertyApplication?.status === "APPROVED"
                  ? "Application approved"
                  : propertyApplication?.status === "SUBMITTED" ||
                      propertyApplication?.status === "UNDER_REVIEW"
                    ? "Application pending review"
                    : propertyApplication?.status === "REJECTED"
                      ? "Application not approved"
                      : "Submit application"}
              </Button>
            </CardContent>
          </Card>
        </>
      ) : null}

      {(contacts.landlord?.userId || contacts.agent?.userId) && (
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="size-5" />
              Chat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {contacts.landlord?.userId ? (
              <Button
                variant="outline"
                className="w-full rounded-none justify-start"
                onClick={() => onChat(contacts.landlord!.userId, contacts.landlord!.name)}
              >
                Chat with merchant
              </Button>
            ) : null}
            {contacts.agent?.userId ? (
              <Button
                variant="outline"
                className="w-full rounded-none justify-start"
                onClick={() => onChat(contacts.agent!.userId!, contacts.agent!.name)}
              >
                Chat with Affiliate
              </Button>
            ) : null}
          </CardContent>
        </Card>
      )}

      <FinancingRequestDialog
        open={financingOpen}
        onOpenChange={setFinancingOpen}
        propertyId={propertyId}
        applicationId={approvedApplication?.id}
        propertyName={propertyName}
        defaultAmount={defaultFinancingAmount}
      />
    </div>
  );
}
