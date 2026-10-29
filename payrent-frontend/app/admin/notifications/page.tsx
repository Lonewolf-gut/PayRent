"use client";

import { NotificationsPanel } from "@/components/dashboard/notifications-panel";
import { Bell } from "lucide-react";

export default function AdminNotificationsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Bell className="h-6 w-6 text-emerald-600" />
          Notifications
        </h1>
        <p className="text-muted-foreground">
          All platform alerts and account updates in one place.
        </p>
      </div>
      <NotificationsPanel />
    </div>
  );
}
