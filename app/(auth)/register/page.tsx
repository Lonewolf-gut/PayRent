import { Suspense } from "react";
import { RegisterFlow } from "@/components/auth/register-flow";

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterFlow />
    </Suspense>
  );
}
