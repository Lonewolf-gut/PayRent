import { DashboardShell } from "@/components/dashboard/dashboard-shell";

const navItems = [
  { href: "/dashboard/landlord", label: "Overview", icon: "Home" as const },
  { href: "/dashboard/landlord/properties", label: "My Listings", icon: "Building2" as const },
  { href: "/dashboard/landlord/applications", label: "Applications", icon: "FileText" as const },
  { href: "/dashboard/landlord/agents", label: "Agents", icon: "Users" as const },
  { href: "/dashboard/landlord/settlements", label: "Settlements", icon: "DollarSign" as const },
  { href: "/dashboard/landlord/wallet", label: "Wallet", icon: "Wallet" as const },
  { href: "/pricing", label: "Subscription", icon: "Crown" as const },
  { href: "/dashboard/landlord/messages", label: "Messages", icon: "MessageSquare" as const },
  { href: "/dashboard/landlord/kyc", label: "Profile & KYC", icon: "Shield" as const },
  { href: "/dashboard/landlord/settings", label: "Settings", icon: "Settings" as const },
];

export default function LandlordLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell items={navItems} title="Landlord">
      {children}
    </DashboardShell>
  );
}
