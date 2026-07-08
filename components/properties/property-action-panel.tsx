"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Wallet, CreditCard, MessageSquare, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { toast } from "sonner";

type PropertyActionPanelProps = {
  propertyId: string;
  propertyName: string;
  isSale: boolean;
  purchasePrice: number;
  walletBalance: number;
  monthlyRent: number;
  propertyStatus: string;
  kycVerified: boolean;
  financingDocsApproved: boolean;
  approvedApplication?: { id: string } | null;
  moveInDate: string;
  setMoveInDate: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  amount: string;
  setAmount: (value: string) => void;
  months: string;
  setMonths: (value: string) => void;
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
  propertyStatus,
  kycVerified,
  financingDocsApproved,
  approvedApplication,
  moveInDate,
  setMoveInDate,
  notes,
  setNotes,
  amount,
  setAmount,
  months,
  setMonths,
  onDepositPrompt,
  onChat,
  contacts,
}: PropertyActionPanelProps) {
  const router = useRouter();

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

  const financeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/financing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          applicationId: approvedApplication?.id,
          requestedAmount: parseFloat(amount),
          durationMonths: parseInt(months, 10),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? json.errors?.[0]?.message);
    },
    onSuccess: () => {
      toast.success("Financing request submitted");
      router.push("/dashboard/buyer/financing");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/properties/${propertyId}/purchase`, { method: "POST" });
      const json = await res.json();
      if (!json.success) {
        if (json.data?.code === "INSUFFICIENT_FUNDS") {
          onDepositPrompt();
          throw new Error("Insufficient wallet balance");
        }
        throw new Error(json.message ?? json.data?.error ?? "Purchase failed");
      }
      return json.data;
    },
    onSuccess: () => {
      toast.success("Purchase completed successfully");
      router.refresh();
    },
    onError: (e: Error) => {
      if (e.message !== "Insufficient wallet balance") toast.error(e.message);
    },
  });

  return (
    <div className="space-y-4">
      {isSale && propertyStatus === "ACTIVE" ? (
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="size-5" />
              Buy with wallet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Pay GHS {purchasePrice.toLocaleString()} directly from your wallet.
            </p>
            <p className="text-sm">
              Balance:{" "}
              <span className="font-semibold text-emerald-700">
                GHS {walletBalance.toLocaleString()}
              </span>
            </p>
            <Button
              className="w-full rounded-none bg-emerald-600 hover:bg-emerald-700"
              disabled={purchaseMutation.isPending}
              onClick={() => purchaseMutation.mutate()}
            >
              {purchaseMutation.isPending ? "Processing..." : "Buy now"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!isSale ? (
        <>
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
                  placeholder="Tell the landlord about yourself"
                />
              </div>
              <Button
                className="w-full rounded-none bg-emerald-600 hover:bg-emerald-700"
                disabled={applyMutation.isPending || !!approvedApplication}
                onClick={() => applyMutation.mutate()}
              >
                {approvedApplication ? "Application approved" : "Submit application"}
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="size-5" />
                Apply for financing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!kycVerified ? (
                <div className="space-y-3 border border-amber-200 bg-amber-50 p-4 text-sm">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                    <p className="text-amber-900">
                      Your account must be fully verified before you can apply for financing.
                      Complete identity, employment, and address verification on your dashboard.
                    </p>
                  </div>
                  <Button className="w-full rounded-none" asChild>
                    <Link href="/dashboard/buyer/kyc">Complete verification</Link>
                  </Button>
                </div>
              ) : !approvedApplication ? (
                <p className="text-sm text-muted-foreground">
                  Submit and get approval for your rental application before requesting financing.
                </p>
              ) : !financingDocsApproved ? (
                <div className="space-y-3 text-sm">
                  <p className="text-muted-foreground">
                    Upload your payslip and 6–12 month bank statement on your dashboard for admin
                    review. Verification documents cannot be uploaded on this page.
                  </p>
                  <Button className="w-full rounded-none" asChild>
                    <Link href="/dashboard/buyer/financing-documents">
                      Upload financing documents
                    </Link>
                  </Button>
                </div>
              ) : (
                <>
                  <StatusBadge status="APPROVED" label="Ready for financing" />
                  <div>
                    <Label>Amount (GHS)</Label>
                    <Input
                      type="number"
                      className="rounded-none"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={String(monthlyRent)}
                    />
                  </div>
                  <div>
                    <Label>Repayment period (months)</Label>
                    <Input
                      type="number"
                      className="rounded-none"
                      value={months}
                      onChange={(e) => setMonths(e.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full rounded-none bg-emerald-600 hover:bg-emerald-700"
                    disabled={!amount || financeMutation.isPending}
                    onClick={() => financeMutation.mutate()}
                  >
                    Submit financing request
                  </Button>
                </>
              )}
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
                onClick={() =>
                  onChat(contacts.landlord!.userId, contacts.landlord!.name)
                }
              >
                Chat with landlord
              </Button>
            ) : null}
            {contacts.agent?.userId ? (
              <Button
                variant="outline"
                className="w-full rounded-none justify-start"
                onClick={() => onChat(contacts.agent!.userId!, contacts.agent!.name)}
              >
                Chat with agent
              </Button>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
