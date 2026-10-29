"use client";

import { Suspense } from "react";
import LoginForm from "@/app/(auth)/login/login-form";

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          Loading...
        </div>
      }
    >
      <LoginForm adminMode />
    </Suspense>
  );
}
