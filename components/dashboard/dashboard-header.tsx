"use client";

import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

export function DashboardHeader({ title }: { title?: string }) {
  const { data: session } = useSession();
  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Unable to load notifications");
      return json.data ?? [];
    },
    refetchInterval: 30000,
    enabled: !!session?.user?.id,
  });

  const unread = notifications?.length ?? 0;

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <p className="font-medium">{title ?? "Dashboard"}</p>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative" asChild>
          <Link href="/dashboard/notifications" aria-label="Notifications">
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white">
                {unread}
              </span>
            )}
          </Link>
        </Button>
        <span className="text-sm text-muted-foreground hidden sm:inline">
          {session?.user?.email}
        </span>
        <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
