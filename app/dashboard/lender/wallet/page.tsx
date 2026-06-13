"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function LenderWalletPage() {
  const [amount, setAmount] = useState("");
  const [bankId, setBankId] = useState("");
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["wallet"],
    queryFn: async () => {
      const res = await fetch("/api/wallet");
      return (await res.json()).data;
    },
  });

  const { data: banks } = useQuery({
    queryKey: ["banks"],
    queryFn: async () => {
      const res = await fetch("/api/bank-accounts");
      return (await res.json()).data ?? [];
    },
  });

  const depositMutation = useMutation({
    mutationFn: async (amt: number) => {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deposit", amount: amt }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      toast.success("Deposit successful");
      setAmount("");
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankAccountId: bankId,
          amount: parseFloat(amount),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
    },
    onSuccess: () => toast.success("Withdrawal requested — verify OTP"),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Lender Wallet</h1>
      <Card>
        <CardHeader><CardTitle>Balance</CardTitle></CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-emerald-600">
            GHS {Number(data?.balance ?? 0).toLocaleString()}
          </p>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Fund wallet</CardTitle></CardHeader>
          <CardContent className="flex gap-2">
            <Input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => depositMutation.mutate(parseFloat(amount))}
            >
              Deposit
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Withdraw</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Label>Bank account</Label>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={bankId}
              onChange={(e) => setBankId(e.target.value)}
            >
              <option value="">Select account</option>
              {banks?.map((b: { id: string; bankName: string; accountNumber: string }) => (
                <option key={b.id} value={b.id}>
                  {b.bankName} — {b.accountNumber}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              className="w-full"
              disabled={!bankId || !amount}
              onClick={() => withdrawMutation.mutate()}
            >
              Request withdrawal
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
