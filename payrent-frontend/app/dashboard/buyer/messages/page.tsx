"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { MessagesInbox } from "@/components/dashboard/messaging/messages-inbox";

function MessagesPageContent() {
  const searchParams = useSearchParams();
  const recipientId = searchParams.get("recipient");

  return <MessagesInbox startRecipientId={recipientId} />;
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading messages...</p>}>
      <MessagesPageContent />
    </Suspense>
  );
}
