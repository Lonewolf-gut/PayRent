import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

const navItems = [
  { href: "/dashboard/lender", label: "Overview", icon: "Home" as const },
  { href: "/dashboard/lender/opportunities", label: "Financing Queue", icon: "FileText" as const },
  { href: "/dashboard/lender/portfolio", label: "Portfolio", icon: "TrendingUp" as const },
  { href: "/dashboard/lender/repayments", label: "Repayments", icon: "CreditCard" as const },
  { href: "/dashboard/lender/wallet", label: "Wallet", icon: "Wallet" as const },
  { href: "/dashboard/lender/messages", label: "Messages", icon: "MessageSquare" as const },
];

export default function LenderLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DashboardSidebar items={navItems} title="Lender" />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader title="Lender Dashboard" />
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </div>
    </>
  );
}
