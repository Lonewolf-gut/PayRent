"use client";

import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TwoFactorSetupPanelProps = {
  enabled: boolean;
  pending: boolean;
  token: string;
  loading: boolean;
  onTokenChange: (value: string) => void;
  onEnable: () => void;
  onContinueSetup: () => void;
  onDisable: () => void;
};

export function TwoFactorSetupPanel({
  enabled,
  pending,
  token,
  loading,
  onTokenChange,
  onEnable,
  onContinueSetup,
  onDisable,
}: TwoFactorSetupPanelProps) {
  if (enabled) {
    return (
      <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/60">
            <ShieldCheck className="size-5 text-emerald-700 dark:text-emerald-300" />
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
              2FA is active on your account
            </p>
            <p className="mt-1 text-sm text-emerald-800/80 dark:text-emerald-200/80">
              Wallet withdrawals will ask for a code from your authenticator app.
            </p>
          </div>
        </div>

        <div className="grid max-w-xs gap-2">
          <Label className="text-foreground">Authenticator code</Label>
          <Input
            value={token}
            onChange={(e) => onTokenChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="6-digit code"
            maxLength={6}
            inputMode="numeric"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          className="text-destructive hover:text-destructive"
          disabled={loading || token.length !== 6}
          onClick={onDisable}
        >
          Turn off 2FA
        </Button>
      </div>
    );
  }

  if (pending) {
    return (
      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div>
          <p className="text-sm font-medium text-foreground">2FA setup in progress</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Scan the QR code in your authenticator app, then confirm with the 6-digit code.
          </p>
        </div>
        <Button
          type="button"
          className="bg-emerald-600 hover:bg-emerald-700"
          disabled={loading}
          onClick={onContinueSetup}
        >
          {loading ? "Loading…" : "Continue 2FA setup"}
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      className="bg-emerald-600 hover:bg-emerald-700"
      disabled={loading}
      onClick={onEnable}
    >
      {loading ? "Preparing setup…" : "Enable 2FA"}
    </Button>
  );
}
