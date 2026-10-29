"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function AdminSubscriptionsPage() {
  const queryClient = useQueryClient();
  const [grantEmail, setGrantEmail] = useState("");
  const [grantDays, setGrantDays] = useState("30");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const res = await fetch("/api/admin/subscriptions");
      const json = await res.json();
      return json.data;
    },
  });

  const actionMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch("/api/admin/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      toast.success("Subscription updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Subscriptions</h1>
        <p className="text-muted-foreground">Grant, extend, or cancel user plans.</p>
      </div>

      <Card className="rounded-none">
        <CardHeader><CardTitle>Grant Premium</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Input placeholder="User email" value={grantEmail} onChange={(e) => setGrantEmail(e.target.value)} className="max-w-xs rounded-none" />
          <Input type="number" placeholder="Days" value={grantDays} onChange={(e) => setGrantDays(e.target.value)} className="w-24 rounded-none" />
          <Button
            className="rounded-none bg-emerald-600 hover:bg-emerald-700"
            disabled={!grantEmail.trim()}
            onClick={() =>
              actionMutation.mutate({
                action: "grant",
                email: grantEmail.trim(),
                days: Number(grantDays) || 30,
              })
            }
          >
            Grant Premium
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-none">
        <CardHeader><CardTitle>All subscriptions</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ends</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.subscriptions?.map((sub: any) => (
                  <TableRow key={sub.id}>
                    <TableCell>{sub.user?.email ?? "—"}</TableCell>
                    <TableCell>{sub.user?.role ?? "—"}</TableCell>
                    <TableCell>{sub.plan}</TableCell>
                    <TableCell><StatusBadge status={sub.status} /></TableCell>
                    <TableCell>{sub.endDate ? new Date(sub.endDate).toLocaleDateString() : "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {sub.status === "ACTIVE" && sub.plan === "PREMIUM" && (
                          <Button size="sm" variant="outline" className="rounded-none" onClick={() => actionMutation.mutate({ action: "extend", subscriptionId: sub.id, days: 30 })}>
                            +30 days
                          </Button>
                        )}
                        {sub.user?.id && sub.plan === "PREMIUM" && (
                          <Button size="sm" variant="outline" className="rounded-none text-red-600" onClick={() => actionMutation.mutate({ action: "cancel", userId: sub.user.id })}>
                            Cancel
                          </Button>
                        )}
                      </div>
                    </TableCell>
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
