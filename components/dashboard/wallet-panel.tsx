"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type BankAccount = {
  id: string;
  bankName: string;
  accountNumberMasked?: string | null;
  accountNumber?: string;
  isVerified: boolean;
};

export function WalletPanel({
  title = "Wallet",
  showWithdraw = false,
}: {
  title?: string;
  showWithdraw?: boolean;
}) {
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [withdrawalId, setWithdrawalId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [twoFaToken, setTwoFaToken] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["wallet"],
    queryFn: async () => {
      const res = await fetch("/api/wallet");
      const json = await res.json();
      return json.data;
    },
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["settings-bank-accounts"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      const json = await res.json();
      return (json.data?.bankAccounts ?? []) as BankAccount[];
    },
    enabled: showWithdraw,
  });

  const verifiedAccounts = bankAccounts.filter((a) => a.isVerified);

  const depositMutation = useMutation({
    mutationFn: async (amt: number) => {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deposit", amount: amt, description: "Wallet deposit" }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      toast.success("Deposit successful");
      setAmount("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const momoMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/payments/momo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseFloat(amount), phone }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      toast.success("MoMo payment initiated");
      setAmount("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const withdrawRequestMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankAccountId,
          amount: parseFloat(withdrawAmount),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Withdrawal request failed");
      return json.data;
    },
    onSuccess: (data) => {
      setWithdrawalId(data.id);
      toast.success("OTP sent. Check your email or phone.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/withdrawals/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withdrawalId, code: otpCode }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "OTP verification failed");
    },
    onSuccess: () => toast.success("OTP verified. Enter your 2FA code to confirm."),
    onError: (e: Error) => toast.error(e.message),
  });

  const confirmWithdrawMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/withdrawals/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withdrawalId, twoFaToken }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Withdrawal confirmation failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      toast.success("Withdrawal completed");
      setWithdrawAmount("");
      setWithdrawalId(null);
      setOtpCode("");
      setTwoFaToken("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-emerald-600">
            GHS {Number(data?.balance ?? 0).toLocaleString()}
          </p>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Direct deposit</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input
              type="number"
              placeholder="Amount (GHS)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 shrink-0"
              disabled={!amount || depositMutation.isPending}
              onClick={() => depositMutation.mutate(parseFloat(amount))}
            >
              Deposit
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>MoMo payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              type="number"
              placeholder="Amount (GHS)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Input
              placeholder="Phone (+233...)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Button
              variant="outline"
              className="w-full"
              disabled={!amount || !phone || momoMutation.isPending}
              onClick={() => momoMutation.mutate()}
            >
              Pay with MoMo
            </Button>
          </CardContent>
        </Card>
      </div>

      {showWithdraw ? (
        <Card>
          <CardHeader>
            <CardTitle>Withdraw funds</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Withdrawals require OTP verification and an active 2FA token.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Amount (GHS)</Label>
                <Input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  disabled={!!withdrawalId}
                />
              </div>
              <div>
                <Label>Payout account</Label>
                <Select
                  value={bankAccountId}
                  onValueChange={(value) => setBankAccountId(value ?? "")}
                  disabled={!!withdrawalId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select verified account" />
                  </SelectTrigger>
                  <SelectContent>
                    {verifiedAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.bankName} ·{" "}
                        {account.accountNumberMasked ?? account.accountNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!withdrawalId ? (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={
                  !withdrawAmount ||
                  !bankAccountId ||
                  withdrawRequestMutation.isPending
                }
                onClick={() => withdrawRequestMutation.mutate()}
              >
                Request withdrawal
              </Button>
            ) : (
              <div className="space-y-4 rounded-lg border p-4">
                <div>
                  <Label>OTP code</Label>
                  <Input
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="Enter OTP from email/SMS"
                  />
                </div>
                <Button
                  variant="outline"
                  disabled={!otpCode || verifyOtpMutation.isPending}
                  onClick={() => verifyOtpMutation.mutate()}
                >
                  Verify OTP
                </Button>
                <div>
                  <Label>2FA token</Label>
                  <Input
                    value={twoFaToken}
                    onChange={(e) => setTwoFaToken(e.target.value)}
                    maxLength={6}
                    placeholder="6-digit authenticator code"
                  />
                </div>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={!twoFaToken || confirmWithdrawMutation.isPending}
                  onClick={() => confirmWithdrawMutation.mutate()}
                >
                  Confirm withdrawal
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Transaction history</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : !data?.transactions?.length ? (
            <p className="text-sm text-muted-foreground">No transactions yet</p>
          ) : (
            <ul className="space-y-2">
              {data.transactions.map(
                (tx: {
                  id: string;
                  type: string;
                  amount: number;
                  status: string;
                  reference: string;
                }) => (
                  <li key={tx.id} className="flex justify-between border-b py-2 text-sm">
                    <span>
                      {tx.type} · {tx.reference}
                    </span>
                    <span>
                      GHS {Number(tx.amount).toLocaleString()} · {tx.status}
                    </span>
                  </li>
                )
              )}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
