"use client";

import { useSearchParams } from "next/navigation";
import { MessagesPanel } from "@/components/dashboard/messages-panel";

export default function TenantMessagesPage() {
  const searchParams = useSearchParams();
  const recipientId = searchParams.get("recipient");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Messages</h1>
      <MessagesPanel startRecipientId={recipientId} />
    </div>
  );
}
