"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

function TrackerInner() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");

  useEffect(() => {
    if (!ref) return;
    const params = new URLSearchParams({ ref });
    fetch(`/api/marketer/referral/track?${params.toString()}`, {
      method: "POST",
    }).catch(() => undefined);
  }, [ref]);

  return null;
}

export function AgentReferralTracker() {
  return (
    <Suspense fallback={null}>
      <TrackerInner />
    </Suspense>
  );
}
