"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { Bookmark, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMessagesPath, getSavedPath } from "@/lib/nav/dashboard-quick-links";
import { cn } from "@/lib/utils";

function formatBadgeCount(count: number) {
  if (count <= 0) return null;
  return count > 9 ? "9+" : String(count);
}

function NavIconButton({
  href,
  label,
  count,
  active,
  children,
}: {
  href: string;
  label: string;
  count?: number;
  active?: boolean;
  children: React.ReactNode;
}) {
  const badge = formatBadgeCount(count ?? 0);

  return (
    <Button
      asChild
      variant={active ? "secondary" : "ghost"}
      size="icon-sm"
      className={cn("relative rounded-full", active && "bg-emerald-100 text-emerald-900")}
    >
      <Link href={href} aria-label={label}>
        {children}
        {badge ? (
          <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-semibold text-white">
            {badge}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}

export function NavQuickActions({ className }: { className?: string }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;

  const savedPath = getSavedPath(role);
  const messagesPath = getMessagesPath(role);

  const { data: savedCount = 0 } = useQuery({
    queryKey: ["saved-property-count"],
    queryFn: async () => {
      const res = await fetch("/api/properties/saved");
      const json = await res.json();
      if (!json.success) return 0;
      return (json.data ?? []).length as number;
    },
    enabled: !!session?.user && role === "BUYER",
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["messages-unread-count"],
    queryFn: async () => {
      const res = await fetch("/api/messages/unread-count");
      const json = await res.json();
      return Number(json.data?.count ?? 0);
    },
    enabled: !!session?.user,
    refetchInterval: 15000,
  });

  if (!session?.user) return null;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {savedPath ? (
        <NavIconButton
          href={savedPath}
          label="Saved properties"
          count={savedCount}
          active={pathname === savedPath}
        >
          <Bookmark className="h-4 w-4" />
        </NavIconButton>
      ) : null}
      <NavIconButton
        href={messagesPath}
        label="Messages"
        count={unreadCount}
        active={pathname.startsWith(messagesPath)}
      >
        <MessageSquare className="h-4 w-4" />
      </NavIconButton>
    </div>
  );
}
