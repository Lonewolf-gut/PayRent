import { auth } from "@/lib/auth";
import { getPostAuthRoute } from "@/lib/auth/post-auth-route";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";

export default async function VerifyPhoneLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role as UserRole;

  if (!session.user.emailVerified && role !== "ADMIN") {
    redirect("/verify-email");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { phoneVerified: true },
  });

  if (user?.phoneVerified || role === "ADMIN" || role === "COMPLIANCE_OFFICER") {
    redirect(
      getPostAuthRoute({
        role,
        emailVerified: Boolean(session.user.emailVerified),
        phoneVerified: true,
      })
    );
  }

  return children;
}
