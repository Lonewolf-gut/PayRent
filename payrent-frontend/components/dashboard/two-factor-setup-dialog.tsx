"use client";

import { useEffect, useState } from "react";
import { Copy, ExternalLink, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type TwoFactorSetupDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  otpauthUrl: string | null;
  secret: string | null;
  token: string;
  loading: boolean;
  onTokenChange: (value: string) => void;
  onVerify: () => void;
};

export function TwoFactorSetupDialog({
  open,
  onOpenChange,
  otpauthUrl,
  secret,
  token,
  loading,
  onTokenChange,
  onVerify,
}: TwoFactorSetupDialogProps) {
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<"scan" | "verify">("scan");

  useEffect(() => {
    if (!open) return;
    setStep("scan");
    onTokenChange("");
  }, [open]);

  async function copySecret() {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      toast.success("Setup key copied.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the setup key.");
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setStep("scan");
    }
    onOpenChange(nextOpen);
  }

  function goToVerify() {
    onTokenChange("");
    setStep("verify");
  }

  if (step === "verify") {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Verify authenticator setup</DialogTitle>
            <DialogDescription>
              Open your authenticator app, find PayForMe, and enter the 6-digit code it shows
              right now.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="two-factor-setup-code">Verification code</Label>
            <Input
              id="two-factor-setup-code"
              value={token}
              onChange={(e) => onTokenChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit code from your app"
              maxLength={6}
              inputMode="numeric"
              autoFocus
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setStep("scan")}>
              Back
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={loading || token.length !== 6}
              onClick={onVerify}
            >
              {loading ? "Confirming…" : "Confirm 2FA setup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>Set up authenticator app</DialogTitle>
          <DialogDescription>
            Scan the QR code with Google Authenticator, Authy, or another TOTP app to add
            PayForMe to your account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {otpauthUrl ? (
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-xl border border-border bg-white p-4">
                <QRCodeSVG value={otpauthUrl} size={200} level="M" includeMargin />
              </div>

              <Button type="button" variant="outline" size="sm" className="gap-2" asChild>
                <a href={otpauthUrl}>
                  <Smartphone className="size-4" />
                  Open in authenticator app
                  <ExternalLink className="size-4 opacity-80" />
                </a>
              </Button>
            </div>
          ) : null}

          {secret ? (
            <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3">
              <p className="text-xs font-medium text-foreground">Can&apos;t scan the QR code?</p>
              <p className="text-xs text-muted-foreground">
                In your authenticator app, choose manual entry and use this setup key (time-based,
                6 digits).
              </p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 break-all rounded-md bg-background px-2 py-1.5 text-xs">
                  {secret}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5"
                  onClick={copySecret}
                >
                  <Copy className="size-3.5" />
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={goToVerify}
          >
            I&apos;ve added PayForMe — verify now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
