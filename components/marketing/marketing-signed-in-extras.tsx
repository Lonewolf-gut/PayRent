"use client";

import { useSession } from "next-auth/react";
import { SubscriptionUpgradeProvider } from "@/components/subscription/subscription-upgrade-provider";
import { SubscriptionUpgradeDialog } from "@/components/dashboard/subscription-upgrade-dialog";
import { MessagesWidget } from "@/components/dashboard/messaging/messages-widget";

export function MarketingSignedInExtras() {
  const { data: session } = useSession();
  if (!session?.user) return null;

  return (
    <SubscriptionUpgradeProvider>
      <MessagesWidget />
      <SubscriptionUpgradeDialog />
    </SubscriptionUpgradeProvider>
  );
}
