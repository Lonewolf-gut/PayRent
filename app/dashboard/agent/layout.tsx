import { DashboardShell } from "@/components/dashboard/dashboard-shell";

const navItems = [
  { href: "/dashboard/agent", label: "Overview", icon: "Home" as const },
  { href: "/dashboard/agent/listings", label: "My Listings", icon: "Building2" as const },
  { href: "/dashboard/agent/promote", label: "Promote & Links", icon: "Share2" as const },
  { href: "/dashboard/agent/earnings", label: "Commissions", icon: "Coins" as const },
  { href: "/dashboard/agent/applications", label: "Applications", icon: "FileText" as const },
  { href: "/dashboard/agent/wallet", label: "Wallet", icon: "Wallet" as const },
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
