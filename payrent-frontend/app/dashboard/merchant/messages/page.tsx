"use client";

import { Suspense } from "react";
import { MessagesInbox } from "@/components/dashboard/messaging/messages-inbox";

export default function LandlordMessagesPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading messages...</p>}>
      <MessagesInbox />
    </Suspense>
  );
}
