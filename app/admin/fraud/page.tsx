"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

export default function AdminFraudPage() {
  const queryClient = useQueryClient();
  const [logFilter, setLogFilter] = useState<"all" | "failed" | "success">("failed");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-fraud", logFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (logFilter === "failed") params.set("success", "false");
      if (logFilter === "success") params.set("success", "true");
      const res = await fetch(`/api/admin/fraud?${params}`);
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
              {data.lockedUsers.map((u: any) => (
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

      <Card className="rounded-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Login activity</CardTitle>
          <div className="flex gap-2">
            {(["failed", "success", "all"] as const).map((f) => (
              <Button key={f} size="sm" variant={logFilter === f ? "default" : "outline"} className="rounded-none" onClick={() => setLogFilter(f)}>
                {f === "all" ? "All" : f === "failed" ? "Failed" : "Success"}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.logs?.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.user?.email ?? log.userId}</TableCell>
                    <TableCell><StatusBadge status={log.success ? "SUCCESSFUL" : "FAILED"} label={log.success ? "Success" : "Failed"} /></TableCell>
                    <TableCell className="font-mono text-xs">{log.ipAddress ?? "—"}</TableCell>
                    <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
