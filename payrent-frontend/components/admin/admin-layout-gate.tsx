"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { AdminDashboardHeader } from "@/components/dashboard/dashboard-header";
import { ADMIN_HOME_PATH } from "@/lib/auth/route-guards";
import type { NavItem } from "@/components/dashboard/sidebar";

const ADMIN_ROLES = new Set(["ADMIN"]);

function resolveAdminCallback(callbackUrl: string | null) {
  if (
    callbackUrl &&
    callbackUrl.startsWith("/admin") &&
    callbackUrl !== "/admin/login"
  ) {
    return callbackUrl;
  }
  return ADMIN_HOME_PATH;
}

export function AdminLayoutGate({
  children,
  navItems,
}: {
  children: React.ReactNode;
  navItems: NavItem[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const isLoginPage = pathname === "/admin/login";
  const isAdmin =
    status === "authenticated" &&
    !!session?.user?.role &&
    ADMIN_ROLES.has(session.user.role);

  useEffect(() => {
    if (status === "loading") return;

    if (isLoginPage) {
      if (isAdmin) {
        router.replace(resolveAdminCallback(searchParams.get("callbackUrl")));
      }
      return;
    }

    if (status === "unauthenticated" || !isAdmin) {
      router.replace(`/admin/login?callbackUrl=${encodeURIComponent(pathname)}`);
    }
  }, [isAdmin, isLoginPage, pathname, router, searchParams, session, status]);

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

  if (!isAdmin) {
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
