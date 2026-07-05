import { DashboardShell } from "@/components/dashboard/dashboard-shell";

const navItems = [
  { href: "/dashboard/agent", label: "Overview", icon: "Home" as const },
  { href: "/dashboard/agent/listings", label: "Assigned Listings", icon: "Building2" as const },
  { href: "/dashboard/agent/applications", label: "Applications", icon: "FileText" as const },
  { href: "/dashboard/agent/messages", label: "Messages", icon: "MessageSquare" as const },
  { href: "/dashboard/agent/wallet", label: "Wallet", icon: "Wallet" as const },
  { href: "/pricing", label: "Subscription", icon: "Crown" as const },
  { href: "/dashboard/agent/kyc", label: "Profile & KYC", icon: "Shield" as const },
  { href: "/dashboard/agent/settings", label: "Settings", icon: "Settings" as const },
];

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell items={navItems} title="Agent">
      {children}
    </DashboardShell>
  );
}
