import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPostLoginRoute } from "@/lib/auth/permissions";
import type { UserRole } from "@prisma/client";

export default async function DashboardIndexPage() {
  const session = await auth();
  if (!session?.user?.role) {
    redirect("/login");
  }

  redirect(getPostLoginRoute(session.user.role as UserRole));
}
