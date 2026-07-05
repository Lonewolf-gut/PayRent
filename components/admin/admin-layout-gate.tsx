"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { AdminDashboardHeader } from "@/components/dashboard/dashboard-header";
import type { NavItem } from "@/components/dashboard/sidebar";

const ADMIN_ROLES = new Set(["ADMIN"]);

export function AdminLayoutGate({
  children,
  navItems,
}: {
  children: React.ReactNode;
  navItems: NavItem[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage || status === "loading") return;

    const role = session?.user?.role;
    if (!session?.user || !role || !ADMIN_ROLES.has(role)) {
      router.replace(`/admin/login?callbackUrl=${encodeURIComponent(pathname)}`);
    }
  }, [isLoginPage, pathname, router, session, status]);

  if (isLoginPage) {
    return <div className="flex min-h-screen w-full flex-1 flex-col">{children}</div>;
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen w-full flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading admin portal…
      </div>
    );
  }

  if (!session?.user?.role || !ADMIN_ROLES.has(session.user.role)) {
    return null;
  }

  return (
    <>
      <DashboardSidebar items={navItems} title="Admin" />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AdminDashboardHeader navItems={navItems} sidebarTitle="Admin" />
        <div className="w-full flex-1 overflow-auto p-4 sm:p-6">{children}</div>
      </div>
    </>
  );
}
