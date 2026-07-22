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
import { CONSENT_LABELS } from "@/lib/constants/consent";

type ConsentRow = {
  id: string;
  consentType: string;
  version: string;
  granted: boolean;
  ipAddress?: string | null;
  grantedAt: string;
  user: { email: string; role: string };
};

export default function ComplianceConsentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["compliance-consents"],
    queryFn: async () => {
      const res = await fetch("/api/compliance/consents?limit=100");
      const json = await res.json();
      return json.data as { items: ConsentRow[]; total: number };
    },
    refetchInterval: 30_000,
  });

  const rows = data?.items ?? [];
  const total = data?.total ?? rows.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Consent records</h1>
        <p className="text-sm text-muted-foreground">
          Data collection and processing consent captured at registration and financing.
          {!isLoading ? ` ${total} record${total === 1 ? "" : "s"} on file.` : ""}
        </p>
      </div>
      <Card className="rounded-none">
        <CardHeader>
          <CardTitle>Captured consents</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading consent records…</p>
          ) : !rows.length ? (
            <p className="text-sm text-muted-foreground">No consent records found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Consent type</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Granted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="text-sm font-medium">{row.user.email}</div>
                      <div className="text-xs text-muted-foreground">{row.user.role}</div>
                    </TableCell>
                    <TableCell>
                      {CONSENT_LABELS[row.consentType] ?? row.consentType}
                    </TableCell>
                    <TableCell>{row.version}</TableCell>
                    <TableCell>{row.ipAddress ?? "—"}</TableCell>
                    <TableCell>{new Date(row.grantedAt).toLocaleString()}</TableCell>
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
