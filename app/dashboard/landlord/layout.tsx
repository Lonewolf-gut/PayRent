import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

const navItems = [
  { href: "/dashboard/landlord", label: "Overview", icon: "Home" as const },
  { href: "/dashboard/landlord/properties", label: "My Listings", icon: "Building2" as const },
  { href: "/dashboard/landlord/applications", label: "Applications", icon: "FileText" as const },
  { href: "/dashboard/landlord/settlements", label: "Settlements", icon: "DollarSign" as const },
  { href: "/dashboard/landlord/wallet", label: "Wallet", icon: "Wallet" as const },
  { href: "/dashboard/landlord/messages", label: "Messages", icon: "MessageSquare" as const },
  { href: "/dashboard/landlord/settings", label: "Settings", icon: "Settings" as const },
];

export default function LandlordLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DashboardSidebar items={navItems} title="Landlord" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader title="Landlord Dashboard" />
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </div>
    </>
  );
}
