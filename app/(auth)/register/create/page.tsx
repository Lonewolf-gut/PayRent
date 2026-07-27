import { Suspense } from "react";
import { RegisterCreateForm } from "@/components/auth/register-create-form";

export default function RegisterCreatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Loading...
        </div>
      }
    >
      <RegisterCreateForm />
    </Suspense>
  );
}
