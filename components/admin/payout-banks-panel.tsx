"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { toast } from "sonner";

type AdminPayoutBank = {
  id: string;
  name: string;
  paystackCode: string;
  resolveCode: string | null;
  isActive: boolean;
  sortOrder: number;
};

type PaystackBankOption = {
  code: string;
  name: string;
  longcode?: string | null;
};

const DEFAULT_BANKS = [
  "GCB Bank",
  "Consolidated Bank Ghana",
  "Agricultural Development Bank",
  "Zenith Bank",
];

export function PayoutBanksPanel() {
  const queryClient = useQueryClient();
  const [selectedPaystackCode, setSelectedPaystackCode] = useState("");
  const [customName, setCustomName] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [resolveCode, setResolveCode] = useState("");

  const { data: banks = [], isLoading } = useQuery({
    queryKey: ["admin-payout-banks"],
    queryFn: async () => {
      const res = await fetch("/api/admin/payout-banks");
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Could not load payout banks");
      return json.data as AdminPayoutBank[];
    },
  });

  const { data: paystackOptions } = useQuery({
    queryKey: ["admin-payout-banks-paystack-options"],
    queryFn: async () => {
      const res = await fetch("/api/admin/payout-banks/paystack-options");
      const json = await res.json();
      return json.data as {
        configured?: boolean;
        banks?: PaystackBankOption[];
      };
    },
  });

  const paystackBanks = paystackOptions?.banks ?? [];
  const selectedPaystackBank = useMemo(
    () => paystackBanks.find((bank) => bank.code === selectedPaystackCode),
    [paystackBanks, selectedPaystackCode]
  );

  const addMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      paystackCode: string;
      resolveCode?: string | null;
    }) => {
      const res = await fetch("/api/admin/payout-banks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Could not add bank");
      return json.data as AdminPayoutBank;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-payout-banks"] });
      setSelectedPaystackCode("");
      setCustomName("");
      setCustomCode("");
      setResolveCode("");
      toast.success("Bank added to user payout list");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/payout-banks/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.message ?? "Could not remove bank");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-payout-banks"] });
      toast.success("Bank removed from user payout list");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function handleRemove(bank: AdminPayoutBank) {
    const confirmed = window.confirm(
      `Remove ${bank.name} from the user payout bank list? Users will no longer be able to add accounts from this bank.`
    );
    if (!confirmed) return;
    deleteMutation.mutate(bank.id);
  }

  function handleAddFromPaystack(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPaystackBank) {
      toast.error("Select a bank from the Paystack list.");
      return;
    }

    addMutation.mutate({
      name: customName.trim() || selectedPaystackBank.name,
      paystackCode: selectedPaystackBank.code,
      resolveCode: resolveCode.trim() || selectedPaystackBank.longcode || null,
    });
  }

  function handleAddManual(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addMutation.mutate({
      name: customName.trim(),
      paystackCode: customCode.trim(),
      resolveCode: resolveCode.trim() || null,
    });
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading payout banks…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          GCB, CBG, ADB, and Zenith are always available. Add more banks here and they will appear
          in the user bank dropdown with live Paystack account lookup. You can remove any additional
          bank at any time using the Remove button.
        </p>
        <ul className="mt-3 space-y-1 text-sm">
          {DEFAULT_BANKS.map((name) => (
            <li key={name} className="text-muted-foreground">
              • {name} <span className="text-xs">(default)</span>
            </li>
          ))}
        </ul>
      </div>

      {banks.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Additional banks</p>
          <div className="divide-y divide-border border border-border">
            {banks.map((bank) => (
              <div
                key={bank.id}
                className="flex items-center justify-between gap-3 px-3 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium">{bank.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Paystack code {bank.paystackCode}
                    {bank.resolveCode ? ` · resolve ${bank.resolveCode}` : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 rounded-none text-destructive hover:text-destructive"
                  onClick={() => handleRemove(bank)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="mr-1.5 size-4" />
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No additional banks added yet.</p>
      )}

      {paystackOptions?.configured === false ? (
        <form onSubmit={handleAddManual} className="space-y-4 border border-border p-4">
          <p className="text-sm font-medium">Add bank manually</p>
          <p className="text-xs text-muted-foreground">
            Paystack is not configured. Enter the bank name and Paystack code manually.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="manual-bank-name">Display name</Label>
              <Input
                id="manual-bank-name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Ecobank Ghana"
                className="rounded-none"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-bank-code">Paystack code</Label>
              <Input
                id="manual-bank-code"
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
                placeholder="130"
                className="rounded-none"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="manual-resolve-code">Resolve code (optional)</Label>
            <Input
              id="manual-resolve-code"
              value={resolveCode}
              onChange={(e) => setResolveCode(e.target.value)}
              placeholder="Leave blank to use Paystack code"
              className="rounded-none"
            />
          </div>
          <Button
            type="submit"
            className="rounded-none bg-emerald-600 hover:bg-emerald-700"
            disabled={addMutation.isPending}
          >
            {addMutation.isPending ? "Adding…" : "Add bank"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleAddFromPaystack} className="space-y-4 border border-border p-4">
          <p className="text-sm font-medium">Add bank from Paystack</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="paystack-bank">Paystack bank</Label>
              <NativeSelect
                id="paystack-bank"
                value={selectedPaystackCode}
                onChange={(e) => {
                  setSelectedPaystackCode(e.target.value);
                  const bank = paystackBanks.find((item) => item.code === e.target.value);
                  setCustomName(bank?.name ?? "");
                  setResolveCode(bank?.longcode ?? "");
                }}
                className="rounded-none"
                required
              >
                <option value="">Select a Ghana bank</option>
                {paystackBanks.map((bank) => (
                  <option key={bank.code} value={bank.code}>
                    {bank.name} ({bank.code})
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="display-name">Display name</Label>
              <Input
                id="display-name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Name shown to users"
                className="rounded-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resolve-code">Resolve code (optional)</Label>
              <Input
                id="resolve-code"
                value={resolveCode}
                onChange={(e) => setResolveCode(e.target.value)}
                placeholder="Leave blank to use Paystack code"
                className="rounded-none"
              />
            </div>
          </div>
          <Button
            type="submit"
            className="rounded-none bg-emerald-600 hover:bg-emerald-700"
            disabled={addMutation.isPending}
          >
            {addMutation.isPending ? "Adding…" : "Add bank"}
          </Button>
        </form>
      )}
    </div>
  );
}
