"use client";

import { useSession } from "next-auth/react";
import { MessagesWidget } from "@/components/dashboard/messaging/messages-widget";

export function MarketingSignedInExtras() {
  const { data: session } = useSession();
  if (!session?.user) return null;

  return <MessagesWidget />;
}
