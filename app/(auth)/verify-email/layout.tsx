import { auth } from "@/lib/auth";
import { getPostLoginRoute } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";

export default async function VerifyEmailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.user.emailVerified || session.user.role === "ADMIN") {
    redirect(getPostLoginRoute(session.user.role as UserRole));
  }

  return children;
}
