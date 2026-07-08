import { DashboardShell } from "@/components/dashboard/dashboard-shell";

const navItems = [
  { href: "/dashboard/merchant", label: "Overview", icon: "Home" as const },
  { href: "/dashboard/merchant/properties", label: "My Listings", icon: "Building2" as const },
  { href: "/dashboard/merchant/applications", label: "Applications", icon: "FileText" as const },
  { href: "/dashboard/merchant/agents", label: "Agents", icon: "Users" as const },
  { href: "/dashboard/merchant/settlements", label: "Settlements", icon: "DollarSign" as const },
  { href: "/dashboard/merchant/wallet", label: "Wallet", icon: "Wallet" as const },
  { href: "/dashboard/merchant/kyc", label: "Profile & KYC", icon: "Shield" as const },
  { href: "/dashboard/merchant/settings", label: "Settings", icon: "Settings" as const },
];

export default function LandlordLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell items={navItems} title="Merchant">
      {children}
    </DashboardShell>
  );
}
