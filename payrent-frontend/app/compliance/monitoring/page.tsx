"use client";

import { useQuery } from "@tanstack/react-query";
import { LoginActivityPanel } from "@/components/admin/login-activity-panel";
import { ScrollableTable } from "@/components/ui/scrollable-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SuspiciousFlag = {
  id: string;
  category: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  title: string;
  description: string;
  entityType: string;
  email?: string | null;
  count?: number;
  detectedAt: string;
};

const severityClass: Record<string, string> = {
  HIGH: "bg-destructive/15 text-destructive",
  MEDIUM: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  LOW: "bg-muted text-muted-foreground",
};

const categoryLabels: Record<string, string> = {
  FAILED_PAYMENTS: "Failed payments",
  UNUSUAL_LENDER_ACTIVITY: "Unusual lender activity",
  FRAUDULENT_LISTING: "Fraudulent listings",
  LOGIN_ANOMALY: "Login anomalies",
};

export default function ComplianceMonitoringPage() {
  const { data: flags, isLoading } = useQuery({
    queryKey: ["compliance-suspicious-activity"],
    queryFn: async () => {
      const res = await fetch("/api/compliance/suspicious-activity");
      const json = await res.json();
      return (json.data?.flags ?? []) as SuspiciousFlag[];
    },
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Suspicious activity</h1>
        <p className="text-sm text-muted-foreground">
          Repeated failed payments, unusual lender activity, fraudulent listings, and login anomalies.
          {!isLoading ? ` ${flags?.length ?? 0} flag${flags?.length === 1 ? "" : "s"} on file.` : ""}
        </p>
      </div>

      <Card className="rounded-none">
        <CardHeader>
          <CardTitle>Automated flags</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {isLoading ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground sm:px-0">Scanning for suspicious activity…</p>
          ) : !flags?.length ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground sm:px-0">No suspicious activity flags right now.</p>
          ) : (
            <ScrollableTable>
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severity</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Alert</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Detected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flags.map((flag) => (
                  <TableRow key={flag.id}>
                    <TableCell>
                      <Badge className={`rounded-none ${severityClass[flag.severity]}`}>
                        {flag.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>{categoryLabels[flag.category] ?? flag.category}</TableCell>
                    <TableCell>
                      <div className="font-medium">{flag.title}</div>
                      <div className="text-xs text-muted-foreground">{flag.description}</div>
                    </TableCell>
                    <TableCell>{flag.email ?? "—"}</TableCell>
                    <TableCell>{new Date(flag.detectedAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </ScrollableTable>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-none">
        <CardHeader>
          <CardTitle>Login activity</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginActivityPanel
            defaultFilter="failed"
            heightClass="h-[420px]"
            apiPath="/api/admin/fraud"
            queryKeyPrefix="compliance-fraud"
          />
        </CardContent>
      </Card>
    </div>
  );
}
