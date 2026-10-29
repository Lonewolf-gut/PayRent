"use client";

import { MessagesInbox } from "@/components/dashboard/messaging/messages-inbox";

export function MessagesPanel({
  startRecipientId,
}: {
  startRecipientId?: string | null;
}) {
  return <MessagesInbox startRecipientId={startRecipientId} />;
}
