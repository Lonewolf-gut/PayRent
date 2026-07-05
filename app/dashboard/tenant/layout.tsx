import { DashboardShell } from "@/components/dashboard/dashboard-shell";

const navItems = [
  { href: "/dashboard/tenant", label: "Overview", icon: "Home" as const },
  { href: "/dashboard/tenant/kyc", label: "Profile & KYC", icon: "Shield" as const },
  { href: "/dashboard/tenant/applications", label: "Applications", icon: "FileText" as const },
  { href: "/dashboard/tenant/properties", label: "Properties", icon: "Building2" as const },
  { href: "/dashboard/tenant/financing", label: "Pay for Rent", icon: "CreditCard" as const },
  { href: "/dashboard/tenant/mandates", label: "Mandates", icon: "DollarSign" as const },
  { href: "/dashboard/tenant/repayments", label: "Repayments", icon: "TrendingUp" as const },
  { href: "/dashboard/tenant/wallet", label: "Wallet", icon: "Wallet" as const },
  { href: "/dashboard/tenant/messages", label: "Messages", icon: "MessageSquare" as const },
  { href: "/dashboard/tenant/settings", label: "Settings", icon: "Settings" as const },
];

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell items={navItems} title="Tenant">
      {children}
    </DashboardShell>
  );
}
