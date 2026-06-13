import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

const navItems = [
  { href: "/dashboard/agent", label: "Overview", icon: "Home" as const },
  { href: "/dashboard/agent/listings", label: "Assigned Listings", icon: "Building2" as const },
  { href: "/dashboard/agent/applications", label: "Applications", icon: "FileText" as const },
  { href: "/dashboard/agent/messages", label: "Messages", icon: "MessageSquare" as const },
  { href: "/dashboard/agent/kyc", label: "Profile & KYC", icon: "Shield" as const },
  { href: "/dashboard/agent/settings", label: "Settings", icon: "Settings" as const },
];

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DashboardSidebar items={navItems} title="Agent" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader title="Agent Dashboard" />
        <div className="flex-1 overflow-auto p-4 sm:p-6">{children}</div>
      </div>
    </>
  );
}
