"use client";

import Link from "next/link";
import { RentVestLogo } from "@/components/rentvest/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserRound, Building2, HandCoins, Shield } from "lucide-react";

const roles = [
  {
    key: "TENANT",
    title: "Tenant",
    icon: UserRound,
    description: "Access financing requests and saved properties.",
  },
  {
    key: "LANDLORD",
    title: "Landlord",
    icon: Building2,
    description: "Manage listings, applicants, and rental activity.",
  },
  {
    key: "LENDER",
    title: "Lender",
    icon: HandCoins,
    description: "Track portfolio performance and funding approvals.",
  },
];

export default function LoginPage() {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-2">
      <div className="hidden bg-[url('https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1400&q=80')] bg-cover bg-center p-12 text-white lg:flex lg:flex-col lg:justify-end">
        <div className="rounded-xl bg-black/45 p-6">
          <h2 className="text-3xl font-semibold">Welcome back to RentForMe.</h2>
          <p className="mt-2 text-emerald-50">Select your role for a focused sign-in experience.</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-2xl bg-white text-slate-900">
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
              <RentVestLogo />
            </div>
            <CardTitle>I am a...</CardTitle>
            <CardDescription>Select your role to continue to sign in.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {roles.map((role) => (
                <Link key={role.key} href={`/login/access?role=${role.key}`}>
                  <Card className="h-full border hover:border-emerald-500 hover:shadow-md">
                    <CardHeader>
                      <role.icon className="h-8 w-8 text-emerald-600" />
                      <CardTitle className="text-base">{role.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-600">{role.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
            <p className="mt-6 text-center text-sm text-slate-600">
              New here?{" "}
              <Link href="/register" className="text-emerald-600 hover:underline">
                Create account
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
