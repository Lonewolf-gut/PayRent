"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function useSubscriptionUpgradePrompt() {
  const router = useRouter();

  function handleLimitError(message: string) {
    if (/upgrade|plan limit/i.test(message)) {
      toast.error(message, {
        action: {
          label: "View plans",
          onClick: () => router.push("/pricing"),
        },
      });
      return true;
    }
    return false;
  }

  return { handleLimitError, upgradeDialog: null };
}
