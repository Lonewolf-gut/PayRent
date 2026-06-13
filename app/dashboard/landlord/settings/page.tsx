"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function LandlordSettingsPage() {
  const [otp, setOtp] = useState("");
  const [twoFaSecret, setTwoFaSecret] = useState<string | null>(null);

  const enable2FA = async () => {
    const res = await fetch("/api/auth/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "enable" }),
    });
    const json = await res.json();
    if (json.success) {
      setTwoFaSecret(json.data.secret);
      toast.success("Scan the secret in your authenticator app");
    } else {
      toast.error(json.error?.message);
    }
  };

  const verify2FA = async () => {
    const res = await fetch("/api/auth/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify", token: otp }),
    });
    const json = await res.json();
    if (json.success) toast.success("2FA enabled");
    else toast.error(json.error?.message);
  };

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" onClick={enable2FA}>
            Generate 2FA secret
          </Button>
          {twoFaSecret && (
            <p className="rounded-lg bg-muted p-3 text-xs font-mono break-all">
              {twoFaSecret}
            </p>
          )}
          <div>
            <Label>Verification code</Label>
            <Input value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} />
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={verify2FA}>
            Enable 2FA
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
