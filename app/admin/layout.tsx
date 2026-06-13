import { DashboardSidebar } from "@/components/dashboard/sidebar";

const navItems = [
  { href: "/admin", label: "Overview", icon: "Shield" as const },
  { href: "/admin/users", label: "Users", icon: "Users" as const },
  {
    href: "/admin/properties",
    label: "Listings",
    icon: "Building2" as const,
    badgeCountEndpoint: "/api/admin/properties?status=PENDING_VERIFICATION",
  },
  { href: "/admin/kyc", label: "KYC Review", icon: "FileText" as const, badgeCountEndpoint: "/api/admin/reviews?type=kyc" },
  { href: "/admin/mandates", label: "Mandates", icon: "CreditCard" as const },
  { href: "/admin/transactions", label: "Transactions", icon: "DollarSign" as const },
  { href: "/admin/reconciliation", label: "Reconciliation", icon: "BarChart3" as const },
  { href: "/admin/settings", label: "Settings", icon: "Settings" as const },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar items={navItems} title="Admin" />
      <div className="flex-1 overflow-auto p-6">{children}</div>
    </div>
  );
}
