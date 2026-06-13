"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function SecuritySettings() {
  const [otp, setOtp] = useState("");
  const [twoFaToken, setTwoFaToken] = useState("");
  const [twoFaSetup, setTwoFaSetup] = useState<{ otpauthUrl?: string; secret?: string } | null>(null);

  const verifyEmail = async () => {
    const res = await fetch("/api/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: otp, purpose: "EMAIL_VERIFY" }),
    });
    const json = await res.json();
    if (json.success) toast.success("Email verified");
    else toast.error(json.error?.message ?? "Verification failed");
  };

  const enable2FA = async () => {
    const res = await fetch("/api/auth/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "enable" }),
    });
    const json = await res.json();
    if (json.success) {
      setTwoFaSetup(json.data);
      toast.success("Scan the secret in your authenticator app");
    } else toast.error(json.error?.message);
  };

  const confirm2FA = async () => {
    const res = await fetch("/api/auth/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify", token: twoFaToken }),
    });
    const json = await res.json();
    if (json.success) toast.success("2FA enabled");
    else toast.error(json.error?.message);
  };

  return (
    <div className="space-y-6 max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Email verification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Verification code</Label>
            <Input value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} />
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={verifyEmail}>
            Verify email
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Two-factor authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!twoFaSetup ? (
            <Button variant="outline" onClick={enable2FA}>
              Enable 2FA
            </Button>
          ) : (
            <>
              <p className="text-sm text-muted-foreground break-all">
                Secret: <code>{twoFaSetup.secret}</code>
              </p>
              <p className="text-xs text-muted-foreground break-all">
                {twoFaSetup.otpauthUrl}
              </p>
              <div>
                <Label>Confirm with 6-digit code</Label>
                <Input value={twoFaToken} onChange={(e) => setTwoFaToken(e.target.value)} />
              </div>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={confirm2FA}>
                Confirm 2FA
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
