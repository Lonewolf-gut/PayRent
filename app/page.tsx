import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPostLoginRoute } from "@/lib/auth/permissions";
import MarketingLayout from "./(marketing)/layout";
import HomePage from "./(marketing)/page";

export default async function RootPage() {
  const session = await auth();
  if (session?.user?.role === "ADMIN") {
    redirect(getPostLoginRoute("ADMIN"));
  }

  return (
    <MarketingLayout>
      <HomePage />
    </MarketingLayout>
  );
}
