import { auth } from "@/lib/auth";
import { getPostAuthRoute } from "@/lib/auth/post-auth-route";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { DashboardThemeProvider } from "@/components/dashboard/dashboard-theme-provider";
import type { UserRole } from "@prisma/client";

export default async function DashboardLayout({
  children,
}: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role as UserRole;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true, phoneVerified: true },
  });

  const emailVerified = Boolean(user?.emailVerified ?? session.user.emailVerified);
  const phoneVerified = Boolean(user?.phoneVerified ?? session.user.phoneVerified);

  const nextStep = getPostAuthRoute({ role, emailVerified, phoneVerified });
  const dashboardHome = getPostAuthRoute({
    role,
    emailVerified: true,
    phoneVerified: true,
  });

  if (nextStep !== dashboardHome) {
    redirect(nextStep);
  }

  return (
    <DashboardThemeProvider className="flex min-h-screen">
      {children}
    </DashboardThemeProvider>
  );
}
