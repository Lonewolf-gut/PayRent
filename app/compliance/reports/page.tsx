"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";

type ReportType =
  | "audit"
  | "kyc"
  | "login"
  | "transactions"
  | "repayments"
  | "user-activity";

type ExportFormat = "csv" | "xlsx" | "pdf";

export default function ComplianceReportsPage() {
  const [exporting, setExporting] = useState<string | null>(null);

  async function handleExport(type: ReportType, format: ExportFormat) {
    const key = `${type}-${format}`;
    setExporting(key);
    try {
      const res = await fetch(`/api/compliance/reports?type=${type}&format=${format}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      const extension = format === "xlsx" ? "xlsx" : format;
      anchor.download = `payforme-${type}-report.${extension}`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} report downloaded`);
    } catch {
      toast.error("Could not export report");
    } finally {
      setExporting(null);
    }
  }

  const reports: { type: ReportType; title: string; desc: string }[] = [
    { type: "audit", title: "Audit trail export", desc: "Approvals, product changes, repayments, and dispute decisions" },
    { type: "transactions", title: "Transaction export", desc: "Wallet transactions across all user roles" },
    { type: "repayments", title: "Repayment export", desc: "Installment schedules, payments, and failed deductions" },
    { type: "user-activity", title: "User activity export", desc: "Property views, logins, and platform actions" },
    { type: "kyc", title: "KYC queue export", desc: "Pending and recent KYC verification records" },
    { type: "login", title: "Login activity export", desc: "Failed and successful login attempts" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Compliance reports</h1>
        <p className="text-sm text-muted-foreground">
          Export records as CSV, Excel, or PDF for regulatory and internal review.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <Card key={report.type} className="rounded-none">
            <CardHeader>
              <CardTitle className="text-base">{report.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{report.desc}</p>
              <div className="flex flex-wrap gap-2">
                {([
                  { format: "csv" as const, label: "CSV", icon: Download },
                  { format: "xlsx" as const, label: "Excel", icon: FileSpreadsheet },
                  { format: "pdf" as const, label: "PDF", icon: FileText },
                ]).map((item) => (
                  <Button
                    key={item.format}
                    variant="outline"
                    size="sm"
                    className="rounded-none"
                    disabled={exporting === `${report.type}-${item.format}`}
                    onClick={() => handleExport(report.type, item.format)}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {exporting === `${report.type}-${item.format}` ? "Exporting…" : item.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
