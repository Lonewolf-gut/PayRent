"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export function WalletPanel({ title = "Wallet" }: { title?: string }) {
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["wallet"],
    queryFn: async () => {
      const res = await fetch("/api/wallet");
      const json = await res.json();
      return json.data;
    },
  });

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
              {data.transactions.map((tx: {
                id: string;
                type: string;
                amount: number;
                status: string;
                reference: string;
              }) => (
                <li key={tx.id} className="flex justify-between border-b py-2 text-sm">
                  <span>{tx.type} · {tx.reference}</span>
                  <span>GHS {Number(tx.amount).toLocaleString()} · {tx.status}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
