"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { RentVestLogo } from "@/components/rentvest/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const roleImages: Record<"TENANT" | "LANDLORD" | "AGENT" | "LENDER", string> = {
  TENANT:
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1400&q=80",
  LANDLORD:
    "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1400&q=80",
  AGENT:
    "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1400&q=80",
  LENDER:
    "https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=1400&q=80",
};

const roleLabels: Record<string, string> = {
  TENANT: "tenant",
  LANDLORD: "landlord",
  AGENT: "agent",
  LENDER: "lender",
};

export default function RegisterCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = (searchParams.get("role") ?? "TENANT") as
    | "TENANT"
    | "LANDLORD"
    | "AGENT"
    | "LENDER";
  const role = ["TENANT", "LANDLORD", "AGENT", "LENDER"].includes(initialRole) ? initialRole : "TENANT";
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role },
  });

  const onSubmit = async (data: RegisterInput) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, role }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error?.message ?? "Registration failed");
        return;
      }
      toast.success("Account created! Please sign in.");
      router.push("/login/access");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-2">
      <div
        className="hidden bg-cover bg-center p-12 text-white lg:flex lg:flex-col lg:justify-end"
        style={{ backgroundImage: `url('${roleImages[role]}')` }}
      >
        <div className="rounded-xl bg-black/45 p-6">
          <h2 className="text-3xl font-semibold">Register as {roleLabels[role]}.</h2>
          <p className="mt-2 text-emerald-50">Secure onboarding with role-based dashboards and payment workflows.</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md bg-white text-slate-900">
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
              <RentVestLogo />
            </div>
            <CardTitle>Create account</CardTitle>
            <CardDescription>Join RentForMe as a {role.toLowerCase()}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" {...register("fullName")} />
                {errors.fullName && (
                  <p className="mt-1 text-xs text-destructive">{errors.fullName.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register("email")} />
                {errors.email && (
                  <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...register("phone")} />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" {...register("password")} />
                {errors.password && (
                  <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={loading}
              >
                {loading ? "Creating account..." : "Create account"}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-slate-600">
              Want a different role?{" "}
              <Link href="/register" className="text-emerald-600 hover:underline">
                Change role
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
