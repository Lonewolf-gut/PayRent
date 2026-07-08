"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoginActivityPanel } from "@/components/admin/login-activity-panel";
import { toast } from "sonner";

export default function AdminFraudPage() {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["admin-fraud-locked"],
    queryFn: async () => {
      const res = await fetch("/api/admin/fraud");
      const json = await res.json();
      return json.data;
    },
  });

  const unlockMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, unlock: true }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-fraud"] });
      toast.success("Account unlocked");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fraud & security</h1>
        <p className="text-sm text-muted-foreground">
          Failed logins (24h): <strong>{data?.failedLast24h ?? 0}</strong>
        </p>
      </div>

      <Card className="rounded-none">
        <CardHeader><CardTitle>Locked / high-risk accounts</CardTitle></CardHeader>
        <CardContent>
          {!data?.lockedUsers?.length ? (
            <p className="text-sm text-muted-foreground">No locked accounts.</p>
          ) : (
            <ul className="space-y-3">
              {data.lockedUsers.map((u: {
                id: string;
                email: string;
                role: string;
                failedLoginCount: number;
                lockedUntil?: string | null;
              }) => (
                <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 border border-slate-200 p-3 text-sm">
                  <div>
                    <p className="font-medium">{u.email}</p>
                    <p className="text-muted-foreground">{u.role} · {u.failedLoginCount} failed attempts</p>
                    {u.lockedUntil && new Date(u.lockedUntil) > new Date() && (
                      <p className="text-amber-700">Locked until {new Date(u.lockedUntil).toLocaleString()}</p>
                    )}
                  </div>
                  <Button size="sm" variant="outline" className="rounded-none" onClick={() => unlockMutation.mutate(u.id)}>Unlock</Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <LoginActivityPanel defaultFilter="failed" heightClass="h-[480px]" />
    </div>
  );
}
