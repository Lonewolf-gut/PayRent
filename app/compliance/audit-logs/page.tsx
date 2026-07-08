"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ComplianceAuditLogsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["compliance-audit-logs"],
    queryFn: async () => {
      const res = await fetch("/api/compliance/audit-logs?limit=100");
      const json = await res.json();
      return json.data?.logs ?? [];
    },
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit logs</h1>
        <p className="text-sm text-muted-foreground">Platform audit trail for compliance review.</p>
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
                  <TableHead>IP</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((log: {
                  id: string;
                  action: string;
                  entity?: string | null;
                  userId?: string | null;
                  ipAddress?: string | null;
                  createdAt: string;
                }) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.action}</TableCell>
                    <TableCell>{log.entity ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{log.userId ?? "—"}</TableCell>
                    <TableCell>{log.ipAddress ?? "—"}</TableCell>
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
