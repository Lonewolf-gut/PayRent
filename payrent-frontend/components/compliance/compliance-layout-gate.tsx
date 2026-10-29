"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { AdminDashboardHeader } from "@/components/dashboard/dashboard-header";
import { COMPLIANCE_HOME_PATH } from "@/lib/auth/route-guards";
import type { NavItem } from "@/components/dashboard/sidebar";

const COMPLIANCE_ROLES = new Set(["COMPLIANCE_OFFICER"]);

function resolveComplianceCallback(callbackUrl: string | null) {
  if (
    callbackUrl &&
    callbackUrl.startsWith("/compliance") &&
    callbackUrl !== "/compliance/login"
  ) {
    return callbackUrl;
  }
  return COMPLIANCE_HOME_PATH;
}

export function ComplianceLayoutGate({
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
  const isLoginPage = pathname === "/compliance/login";
  const isComplianceOfficer =
    status === "authenticated" &&
    !!session?.user?.role &&
    COMPLIANCE_ROLES.has(session.user.role);

  useEffect(() => {
    if (status === "loading") return;

    if (isLoginPage) {
      if (isComplianceOfficer) {
        router.replace(resolveComplianceCallback(searchParams.get("callbackUrl")));
      }
      return;
    }

    if (status === "unauthenticated" || !isComplianceOfficer) {
      router.replace(`/compliance/login?callbackUrl=${encodeURIComponent(pathname)}`);
    }
  }, [isComplianceOfficer, isLoginPage, pathname, router, searchParams, session, status]);

  if (isLoginPage) {
    return <div className="flex min-h-screen w-full flex-1 flex-col">{children}</div>;
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen w-full flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading compliance portal…
      </div>
    );
  }

  if (!isComplianceOfficer) {
    return null;
  }

  return (
    <>
      <DashboardSidebar items={navItems} title="Compliance" />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AdminDashboardHeader navItems={navItems} sidebarTitle="Compliance" />
        <div className="w-full flex-1 overflow-auto p-4 sm:p-6">{children}</div>
      </div>
    </>
  );
}
