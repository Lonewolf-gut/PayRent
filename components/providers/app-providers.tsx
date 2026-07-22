"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";
import { useEffect, useState } from "react";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60 * 1000, refetchOnWindowFocus: false },
        },
      })
  );

  useEffect(() => {
    // Drop legacy profile query keys that could return undefined and crash React Query.
    for (const legacyKey of [
      ["sidebar-profile"],
      ["dashboard-profile"],
      ["navbar-profile"],
      ["widget-profile"],
    ]) {
      queryClient.removeQueries({ queryKey: legacyKey });
    }
  }, [queryClient]);

  return (
    <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </SessionProvider>
  );
}
