"use client";

import { useState } from "react";
import { CheckCircle2, Copy, ExternalLink, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type TwoFactorSetupPanelProps = {
  enabled: boolean;
  pending: boolean;
  secret: string | null;
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
  secret,
  otpauthUrl,
  token,
  loading,
  onTokenChange,
  onEnable,
  onVerify,
  onDisable,
}: TwoFactorSetupPanelProps) {
  const [copied, setCopied] = useState(false);

  async function copySecret() {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      toast.success("Secret copied to clipboard");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy secret. Select and copy it manually.");
    }
  }

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

        <Button type="button" variant="outline" disabled={loading} onClick={onDisable}>
          Disable 2FA
        </Button>
      </div>
    );
  }

  if (pending) {
    return (
      <div className="space-y-4 rounded-xl border border-border bg-card p-4">
        <div>
          <p className="text-sm font-medium text-foreground">Add PayForMe to your authenticator app</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Tap the button below to add this account in your authenticator app. Then enter the
            6-digit code the app shows you.
          </p>
        </div>

        {otpauthUrl ? (
          <div className="space-y-3">
            <Button
              type="button"
              className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 sm:w-auto"
              asChild
            >
              <a href={otpauthUrl}>
                <Smartphone className="size-4" />
                Open in authenticator app
                <ExternalLink className="size-4 opacity-80" />
              </a>
            </Button>
            <p className="text-xs text-muted-foreground">
              Works with Google Authenticator, Authy, Microsoft Authenticator, and other TOTP
              apps. On desktop, use the secret key below if your browser does not open the app.
            </p>
          </div>
        ) : null}

        {secret ? (
          <div className="space-y-2">
            <Label className="text-foreground">Or enter this secret manually</Label>
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <p className="font-mono text-sm break-all text-foreground">{secret}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copySecret}
              className="gap-2"
            >
              {copied ? <CheckCircle2 className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy secret"}
            </Button>
          </div>
        ) : null}

        <div className="grid max-w-xs gap-2">
          <Label className="text-foreground">Verification code from your app</Label>
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
          className="bg-emerald-600 hover:bg-emerald-700"
          disabled={loading}
          onClick={onVerify}
        >
          Confirm 2FA setup
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
      Enable 2FA
    </Button>
  );
}
