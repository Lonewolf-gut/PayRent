"use client";

import { ExternalLink, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TwoFactorSetupPanelProps = {
  enabled: boolean;
  pending: boolean;
  otpauthUrl: string | null;
  token: string;
  loading: boolean;
  onTokenChange: (value: string) => void;
  onEnable: () => void;
  onVerify: () => void;
  onDisable: () => void;
};

export function TwoFactorSetupPanel({
  enabled,
  pending,
  otpauthUrl,
  token,
  loading,
  onTokenChange,
  onEnable,
  onVerify,
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
      <div className="space-y-4 rounded-xl border border-border bg-card p-4">
        <div>
          <p className="text-sm font-medium text-foreground">Check your authenticator app</p>
          <p className="mt-1 text-sm text-muted-foreground">
            PayForMe should now appear in your authenticator app. Enter the 6-digit code it
            shows below to finish setup.
          </p>
        </div>

        {otpauthUrl ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            asChild
          >
            <a href={otpauthUrl}>
              <Smartphone className="size-4" />
              Open authenticator app again
              <ExternalLink className="size-4 opacity-80" />
            </a>
          </Button>
        ) : null}

        <div className="grid max-w-xs gap-2">
          <Label className="text-foreground">Verification code</Label>
          <Input
            value={token}
            onChange={(e) => onTokenChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="6-digit code"
            maxLength={6}
            inputMode="numeric"
            autoFocus
          />
        </div>

        <Button
          type="button"
          className="bg-emerald-600 hover:bg-emerald-700"
          disabled={loading || token.length !== 6}
          onClick={onVerify}
        >
          {loading ? "Confirming…" : "Confirm 2FA setup"}
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
      {loading ? "Opening authenticator…" : "Enable 2FA"}
    </Button>
  );
}
