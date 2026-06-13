"use client";

import { Suspense } from "react";
import LoginForm from "@/app/(auth)/login/login-form";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="w-full max-w-md space-y-4 p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900">Admin Portal</h1>
            <p className="text-sm text-slate-600 mt-2">Secure administrator access</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <LoginForm adminMode={true} />
          </div>
        </div>
      </div>
    </Suspense>
  );
}
