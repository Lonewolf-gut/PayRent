"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

type NotificationsAllResponse = {
  items: NotificationItem[];
  unreadCount: number;
};

export function NotificationsPanel() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", "all"],
    queryFn: async () => {
      const res = await fetch("/api/notifications?all=true");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Unable to load notifications");
      return json.data as NotificationsAllResponse;
    },
    refetchInterval: 15000,
    enabled: !!session?.user?.id,
  });

  const notifications = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "all"] });
    },
  });

  const clearAll = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications", { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Unable to clear notifications");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "all"] });
    },
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading notifications...</p>;
  }

  if (!notifications.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12 text-center">
          <Bell className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">No notifications yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {unreadCount > 0
            ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
            : "All notifications read"}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={clearAll.isPending}
          onClick={() => clearAll.mutate()}
        >
          Clear all
        </Button>
      </div>
      <div className="space-y-3">
        {notifications.map((n) => (
          <Card key={n.id} className={n.read ? "opacity-60" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{n.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">{n.body}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {new Date(n.createdAt).toLocaleString()}
                </span>
                {!n.read ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => markRead.mutate(n.id)}
                  >
                    Mark read
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
