"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { RentVestLogo } from "@/components/rentvest/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DASHBOARD_ROUTES } from "@/lib/auth/permissions";
import { toast } from "sonner";

interface LoginFormProps {
  adminMode?: boolean;
}

export default function LoginForm({ adminMode = false }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const role = (adminMode ? "ADMIN" : (searchParams.get("role") ?? "TENANT")) as
    | "TENANT"
    | "LANDLORD"
    | "LENDER"
    | "ADMIN";
  const roleLabels: Record<string, string> = {
    TENANT: "tenant",
    LANDLORD: "landlord",
      LENDER: "lender",
    ADMIN: "administrator",
  };
  const roleImage =
    role === "LANDLORD"
      ? "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1400&q=80"
        : role === "LENDER"
        ? "https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=1400&q=80"
        : "https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=1400&q=80";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginInput) => {
    setLoading(true);

    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    setLoading(false);

    if (result?.error) {
      toast.error("Invalid credentials. Check email/password or ensure the database is seeded.");
      return;
    }

    const res = await fetch("/api/auth/session");
    const session = await res.json();
    const dashboard = session?.user?.role
      ? DASHBOARD_ROUTES[session.user.role as keyof typeof DASHBOARD_ROUTES]
      : callbackUrl;
    router.push(dashboard);
    router.refresh();
  };

  return (
    <div className={adminMode ? "min-h-screen bg-slate-50" : "grid min-h-screen bg-white lg:grid-cols-2"}>
      {!adminMode && (
        <div
          className="hidden bg-cover bg-center p-12 text-white lg:flex lg:flex-col lg:justify-end"
          style={{ backgroundImage: `url('${roleImage}')` }}
        >
          <div className="rounded-xl bg-black/45 p-6">
            <h2 className="text-3xl font-semibold">Sign in as {roleLabels[role] ?? "user"}.</h2>
            <p className="mt-2 text-emerald-50">
              Secure access to your personalized RentForMe dashboard.
            </p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md bg-white text-slate-900">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <RentVestLogo />
          </div>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Sign in to your RentForMe account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register("password")} />
              {errors.password && (
                <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href={`/register/create?role=${role}`} className="text-emerald-600 hover:underline">
              Register
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Select a different role?{" "}
            <Link href="/login" className="text-emerald-600 hover:underline">
              Change role
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Forgot your password?{" "}
            <Link href="/forgot-password" className="text-emerald-600 hover:underline">
              Reset it
            </Link>
          </p>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
