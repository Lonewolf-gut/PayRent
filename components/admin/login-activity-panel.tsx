"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileSpreadsheet } from "lucide-react";
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
import {
  downloadLoginCsv,
  downloadLoginPdf,
  loginExportFilename,
  loginLogsToCsv,
} from "@/lib/utils/login-export";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type LogFilter = "all" | "failed" | "success";

type LoginLogRow = {
  id: string;
  userId?: string | null;
  email?: string | null;
  success: boolean;
  ipAddress?: string | null;
  createdAt: string;
  user?: { email?: string | null } | null;
};

export function LoginActivityPanel({
  className,
  defaultFilter = "all",
  showExport = true,
  heightClass = "h-[420px]",
}: {
  className?: string;
  defaultFilter?: LogFilter;
  showExport?: boolean;
  heightClass?: string;
}) {
  const [logFilter, setLogFilter] = useState<LogFilter>(defaultFilter);
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-fraud", logFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "200" });
      if (logFilter === "failed") params.set("success", "false");
      if (logFilter === "success") params.set("success", "true");
      const res = await fetch(`/api/admin/fraud?${params}`);
      const json = await res.json();
      return json.data as {
        logs?: LoginLogRow[];
        failedLast24h?: number;
      };
    },
    refetchInterval: 30_000,
  });

  const logs = data?.logs ?? [];

  async function handleExportExcel() {
    setExporting("excel");
    try {
      const csv = loginLogsToCsv(logs);
      downloadLoginCsv(csv, loginExportFilename("csv"));
      toast.success("Login activity exported");
    } catch {
      toast.error("Could not export to Excel");
    } finally {
      setExporting(null);
    }
  }

  async function handleExportPdf() {
    setExporting("pdf");
    try {
      await downloadLoginPdf(logs, loginExportFilename("pdf"));
      toast.success("PDF downloaded");
    } catch {
      toast.error("Could not export to PDF");
    } finally {
      setExporting(null);
    }
  }

  return (
    <Card className={cn("rounded-none", className)}>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Login activity</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Failed logins (24h): <strong>{data?.failedLast24h ?? 0}</strong>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["failed", "success", "all"] as const).map((filter) => (
            <Button
              key={filter}
              size="sm"
              variant={logFilter === filter ? "default" : "outline"}
              className={cn(
                "rounded-none",
                logFilter === filter && "bg-emerald-600 hover:bg-emerald-700"
              )}
              onClick={() => setLogFilter(filter)}
            >
              {filter === "all" ? "All" : filter === "failed" ? "Failed" : "Success"}
            </Button>
          ))}
          {showExport ? (
            <>
              <Button
                size="sm"
                variant="outline"
                className="rounded-none"
                disabled={!logs.length || exporting !== null}
                onClick={handleExportExcel}
              >
                <FileSpreadsheet className="mr-1.5 h-4 w-4" />
                {exporting === "excel" ? "Exporting…" : "Export Excel"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-none"
                disabled={!logs.length || exporting !== null}
                onClick={handleExportPdf}
              >
                <Download className="mr-1.5 h-4 w-4" />
                {exporting === "pdf" ? "Exporting…" : "Export PDF"}
              </Button>
            </>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading login activity…</p>
        ) : !logs.length ? (
          <p className="text-sm text-muted-foreground">No login activity for this filter.</p>
        ) : (
          <div className={cn("overflow-auto rounded-md border", heightClass)}>
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.user?.email ?? log.email ?? log.userId ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge
                        status={log.success ? "SUCCESSFUL" : "FAILED"}
                        label={log.success ? "Success" : "Failed"}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.ipAddress ?? "—"}</TableCell>
                    <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
