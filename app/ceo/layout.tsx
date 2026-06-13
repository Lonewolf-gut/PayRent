import { DashboardSidebar } from "@/components/dashboard/sidebar";

const navItems = [
  { href: "/ceo", label: "Analytics", icon: "BarChart3" as const },
  { href: "/ceo/revenue", label: "Revenue", icon: "DollarSign" as const },
  { href: "/ceo/users", label: "Users", icon: "Users" as const },
  { href: "/ceo/properties", label: "Properties", icon: "Building2" as const },
];

export default function CeoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar items={navItems} title="Admin" />
      <div className="flex-1 overflow-auto p-6">{children}</div>
    </div>
  );
}
