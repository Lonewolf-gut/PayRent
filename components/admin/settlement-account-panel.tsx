"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type SettlementAccount = {
  id: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  isDefault: boolean;
};

export function SettlementAccountPanel() {
  const queryClient = useQueryClient();
  const [bankName, setBankName] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-settlement-account"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settlement-account");
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Could not load collection account");
      return json.data as { accounts: SettlementAccount[] };
    },
  });

  const defaultAccount = useMemo(
    () => data?.accounts.find((account) => account.isDefault) ?? data?.accounts[0],
    [data]
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/settlement-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankName,
          bankCode,
          accountNumber,
          accountName,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Could not save collection account");
      return json.data as SettlementAccount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settlement-account"] });
      toast.success("Collection account saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Customer bank deposits are sent to this account. Users receive a unique reference in the
        wallet screen to include in their transfer narration.
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : defaultAccount ? (
        <div className="rounded-none border border-border bg-muted/20 p-4 text-sm">
          <p className="font-medium">{defaultAccount.accountName}</p>
          <p>{defaultAccount.bankName}</p>
          <p>Account: {defaultAccount.accountNumber}</p>
          <p className="text-muted-foreground">Bank code: {defaultAccount.bankCode}</p>
        </div>
      ) : (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          No collection account configured yet.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="settlement-bank-name">Bank name</Label>
          <Input
            id="settlement-bank-name"
            value={bankName || defaultAccount?.bankName || ""}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="GCB Bank"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="settlement-bank-code">Bank code</Label>
          <Input
            id="settlement-bank-code"
            value={bankCode || defaultAccount?.bankCode || ""}
            onChange={(e) => setBankCode(e.target.value)}
            placeholder="040"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="settlement-account-number">Account number</Label>
          <Input
            id="settlement-account-number"
            value={accountNumber || defaultAccount?.accountNumber || ""}
            onChange={(e) => setAccountNumber(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="settlement-account-name">Account name</Label>
          <Input
            id="settlement-account-name"
            value={accountName || defaultAccount?.accountName || ""}
            onChange={(e) => setAccountName(e.target.value)}
          />
        </div>
      </div>

      <Button
        className="rounded-none bg-emerald-600 hover:bg-emerald-700"
        disabled={saveMutation.isPending}
        onClick={() => saveMutation.mutate()}
      >
        Save collection account
      </Button>
    </div>
  );
}
