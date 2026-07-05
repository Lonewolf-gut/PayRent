"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RentVestLogo } from "@/components/rentvest/logo";
import { AuthSplitLayout } from "@/components/rentvest/auth-split-layout";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [devResetCode, setDevResetCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onRequestCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        toast.error(json.error?.message ?? "Could not send reset code. Try again.");
        return;
      }

      setDevResetCode(json.data?.devResetCode ?? null);
      setStep("reset");
      toast.success(
        json.data?.devResetCode
          ? "Development mode: use the reset code shown below."
          : "If your account exists, a reset code has been sent to your email."
      );
    } finally {
      setLoading(false);
    }
  };

  const onResetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !code || !password) return;
    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code,
          password,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        toast.error(json.error?.message ?? "Could not reset password.");
        return;
      }

      toast.success("Password updated. You can sign in now.");
      router.push("/login/access");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      hero={
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1400&q=80')] bg-cover bg-center">
          <div className="flex h-full flex-col justify-end p-12">
            <div className="max-w-lg rounded-xl bg-black/50 p-8 backdrop-blur-sm">
              <h2 className="text-3xl font-semibold leading-tight tracking-tight">
                Reset your password
              </h2>
              <p className="mt-3 text-base leading-relaxed text-emerald-50/90">
                We&apos;ll send a secure code to your email so you can regain access to your
                PayForMe account.
              </p>
            </div>
          </div>
        </div>
      }
    >
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <RentVestLogo showIcon={false} />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900">
            {step === "email" ? "Forgot password" : "Reset password"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === "email"
              ? "Enter your email to receive a reset code."
              : "Enter the code and choose a new password."}
          </p>
        </div>
        {step === "email" ? (
          <form onSubmit={onRequestCode} className="mt-8 space-y-5">
            <div className="space-y-2.5">
              <Label htmlFor="email">Enter your email address</Label>
              <Input
                id="email"
                type="email"
                className="h-11"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
              />
            </div>
            <Button
              type="submit"
              className="h-11 w-full rounded-full bg-emerald-600 hover:bg-emerald-700"
              disabled={loading || !email}
            >
              {loading ? "Sending..." : "Send reset code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={onResetPassword} className="mt-8 space-y-4">
            {devResetCode ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-medium">Development reset code</p>
                <p className="mt-1 font-mono text-lg tracking-widest">{devResetCode}</p>
                <p className="mt-2 text-xs text-amber-800">
                  Email is not configured locally, so the code is shown here instead of Gmail.
                </p>
              </div>
            ) : null}
            <div>
              <Label htmlFor="email-readonly">Email</Label>
              <Input id="email-readonly" type="email" className="h-11" value={email} readOnly />
            </div>
            <div>
              <Label htmlFor="code">Reset code</Label>
              <Input
                id="code"
                inputMode="numeric"
                maxLength={6}
                className="h-11"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="6-digit code"
              />
            </div>
            <div>
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                className="h-11"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 chars, 1 uppercase, 1 number"
              />
            </div>
            <Button
              type="submit"
              className="h-11 w-full rounded-full bg-emerald-600 hover:bg-emerald-700"
              disabled={loading || !code || !password}
            >
              {loading ? "Updating..." : "Update password"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full"
              onClick={() => {
                setStep("email");
                setCode("");
                setPassword("");
                setDevResetCode(null);
              }}
            >
              Use a different email
            </Button>
          </form>
        )}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Remembered your password?{" "}
          <Link href="/login" className="text-emerald-600 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
}
