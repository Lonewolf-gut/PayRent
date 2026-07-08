"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

type ReportType =
  | "audit"
  | "kyc"
  | "login"
  | "transactions"
  | "repayments"
  | "user-activity";

export default function ComplianceReportsPage() {
  const [exporting, setExporting] = useState<ReportType | null>(null);

  async function handleExport(type: ReportType) {
    setExporting(type);
    try {
      const res = await fetch(`/api/compliance/reports?type=${type}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `payforme-${type}-report.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Report downloaded");
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
          Exportable transaction, repayment, and user activity reports for regulatory review.
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
              <Button
                variant="outline"
                size="sm"
                className="rounded-none"
                disabled={exporting === report.type}
                onClick={() => handleExport(report.type)}
              >
                <Download className="mr-2 h-4 w-4" />
                {exporting === report.type ? "Exporting…" : "Download CSV"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
