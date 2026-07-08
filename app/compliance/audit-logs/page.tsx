"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AuditLogRow = {
  id: string;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  createdAt: string;
  user?: { email: string; role: string } | null;
};

export default function ComplianceAuditLogsPage() {
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["compliance-audit-logs", actionFilter, entityFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "100" });
      if (actionFilter.trim()) params.set("action", actionFilter.trim());
      if (entityFilter.trim()) params.set("entity", entityFilter.trim());
      const res = await fetch(`/api/compliance/audit-logs?${params}`);
      const json = await res.json();
      return (json.data?.logs ?? []) as AuditLogRow[];
    },
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit logs</h1>
        <p className="text-sm text-muted-foreground">
          Audit trail for approvals, product changes, repayments, and dispute decisions.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="action-filter">Filter by action</Label>
          <Input
            id="action-filter"
            className="rounded-none"
            placeholder="e.g. FINANCING_APPROVED"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="entity-filter">Filter by entity</Label>
          <Input
            id="entity-filter"
            className="rounded-none"
            placeholder="e.g. Property"
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
          />
        </div>
      </div>

      <Card className="rounded-none">
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading audit logs…</p>
          ) : !data?.length ? (
            <p className="text-sm text-muted-foreground">No audit logs found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.action}</TableCell>
                    <TableCell>
                      {log.entity ?? "—"}
                      {log.entityId ? (
                        <div className="font-mono text-xs text-muted-foreground">
                          {log.entityId.slice(0, 10)}…
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{log.user?.email ?? log.userId ?? "—"}</div>
                      {log.user?.role ? (
                        <div className="text-xs text-muted-foreground">{log.user.role}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                      {log.metadata ? JSON.stringify(log.metadata) : log.ipAddress ?? "—"}
                    </TableCell>
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
