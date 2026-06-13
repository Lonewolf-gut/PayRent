"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQueries } from "@tanstack/react-query";
import {
  Home,
  Building2,
  CreditCard,
  Wallet,
  MessageSquare,
  Settings,
  TrendingUp,
  FileText,
  Shield,
  Users,
  DollarSign,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RentVestLogo } from "@/components/rentvest/logo";
import { Badge } from "@/components/ui/badge";

const ICONS: Record<string, LucideIcon> = {
  Home,
  Building2,
  CreditCard,
  Wallet,
  MessageSquare,
  Settings,
  TrendingUp,
  FileText,
  Shield,
  Users,
  DollarSign,
  BarChart3,
};

export interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  badgeCountEndpoint?: string;
}

export function DashboardSidebar({
  items,
  title,
}: {
  items: NavItem[];
  title: string;
}) {
  const pathname = usePathname();

  const countQueries = useQueries({
    queries: items
      .filter((item) => item.badgeCountEndpoint)
      .map((item) => ({
        queryKey: ["sidebar-badge", item.href],
        queryFn: async () => {
          const res = await fetch(item.badgeCountEndpoint as string);
          const json = await res.json();
          return Number(json.data?.length ?? json.data ?? 0);
        },
        staleTime: 1000 * 30,
        refetchInterval: 1000 * 60,
      })),
  });

  const badgeCountMap = new Map(
    items
      .filter((item) => item.badgeCountEndpoint)
      .map((item, index) => [item.href, countQueries[index]?.data ?? 0])
  );

  return (
    <aside className="hidden w-64 flex-col border-r bg-card lg:flex">
      <div className="flex h-16 items-center border-b px-6">
        <RentVestLogo />
      </div>
      <div className="px-4 py-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          const active = pathname === item.href;
          const badgeCount = item.badgeCountEndpoint
            ? badgeCountMap.get(item.href) ?? 0
            : 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-emerald-600 text-white"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-3">
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </span>
              {badgeCount > 0 ? (
                <Badge variant="secondary">{badgeCount}</Badge>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
