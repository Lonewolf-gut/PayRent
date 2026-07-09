import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { countFailedLoginsLast24h } from "@/lib/admin/failed-login-stats";
import { kycService } from "@/lib/services/kyc.service";
import { loginLogsToCsv } from "@/lib/utils/login-export";
import {
  rowsToCsv,
  rowsToExcel,
  complianceExportFilename,
} from "@/lib/utils/compliance-export";
import { withAuth } from "@/lib/api/handler";

async function buildReportRows(type: string): Promise<Record<string, unknown>[]> {
  if (type === "audit") {
    const logs = await prisma.auditLog.findMany({
      take: 2000,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true, role: true } } },
    });
    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      userId: log.userId,
      userEmail: log.user?.email,
      userRole: log.user?.role,
      ipAddress: log.ipAddress,
      metadata: log.metadata ? JSON.stringify(log.metadata) : "",
      createdAt: log.createdAt.toISOString(),
    }));
  }

  if (type === "kyc") {
    const reviews = await kycService.getPendingKycReviews();
    return reviews as unknown as Record<string, unknown>[];
  }

  if (type === "login") {
    const logs = await prisma.loginLog.findMany({
      take: 2000,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true } } },
    });
    await countFailedLoginsLast24h();
    return logs.map((log) => ({
      email: log.email ?? log.user?.email ?? "",
      success: log.success ? "Success" : "Failed",
      ipAddress: log.ipAddress ?? "",
      createdAt: log.createdAt.toISOString(),
    }));
  }

  if (type === "transactions") {
    const transactions = await prisma.walletTransaction.findMany({
      take: 2000,
      orderBy: { createdAt: "desc" },
      include: {
        wallet: {
          include: {
            user: { select: { email: true, role: true } },
          },
        },
      },
    });
    return transactions.map((tx) => ({
      id: tx.id,
      reference: tx.reference,
      type: tx.type,
      status: tx.status,
      amount: tx.amount.toString(),
      fee: tx.fee.toString(),
      commission: tx.commission.toString(),
      netAmount: tx.netAmount.toString(),
      userEmail: tx.wallet.user?.email ?? "",
      userRole: tx.wallet.user?.role ?? "",
      description: tx.description,
      createdAt: tx.createdAt.toISOString(),
    }));
  }

  if (type === "repayments") {
    const installments = await prisma.installment.findMany({
      take: 2000,
      orderBy: { dueDate: "desc" },
      include: {
        repaymentPlan: {
          include: {
            financing: {
              include: {
                tenant: { include: { user: { select: { email: true } } } },
                property: { select: { name: true } },
              },
            },
          },
        },
        deductionEvents: { orderBy: { attemptedAt: "desc" } },
      },
    });
    return installments.map((inst) => ({
      installmentId: inst.id,
      instalmentNumber: inst.instalmentNumber,
      amount: inst.amount.toString(),
      amountPaid: inst.amountPaid?.toString() ?? "",
      status: inst.status,
      dueDate: inst.dueDate.toISOString(),
      paidAt: inst.paidAt?.toISOString() ?? "",
      customerEmail: inst.repaymentPlan.financing.tenant.user.email,
      propertyName: inst.repaymentPlan.financing.property.name,
      failedAttempts: inst.deductionEvents.filter((e) => e.status === "FAILED").length,
    }));
  }

  if (type === "user-activity") {
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const [views, logins, audits] = await Promise.all([
      prisma.propertyView.findMany({
        where: { createdAt: { gte: since } },
        take: 1000,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { email: true } },
          property: { select: { name: true } },
        },
      }),
      prisma.loginLog.findMany({
        where: { createdAt: { gte: since } },
        take: 1000,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { email: true } } },
      }),
      prisma.auditLog.findMany({
        where: { createdAt: { gte: since } },
        take: 1000,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { email: true } } },
      }),
    ]);

    return [
      ...views.map((view) => ({
        activityType: "PROPERTY_VIEW",
        userEmail: view.user?.email ?? "",
        entity: view.property.name,
        entityId: view.propertyId,
        timestamp: view.createdAt.toISOString(),
      })),
      ...logins.map((log) => ({
        activityType: log.success ? "LOGIN_SUCCESS" : "LOGIN_FAILED",
        userEmail: log.email ?? log.user?.email ?? "",
        entity: "Login",
        entityId: log.id,
        timestamp: log.createdAt.toISOString(),
      })),
      ...audits.map((log) => ({
        activityType: log.action,
        userEmail: log.user?.email ?? "",
        entity: log.entity ?? "",
        entityId: log.entityId ?? "",
        timestamp: log.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(String(b.timestamp)).getTime() - new Date(String(a.timestamp)).getTime())
      .slice(0, 2000);
  }

  return [];
}

async function buildPdfBuffer(rows: Record<string, unknown>[], title: string) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default;
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(`PayForMe — ${title}`, 14, 16);
  doc.setFontSize(10);
  doc.text(`Exported ${new Date().toLocaleString()} · ${rows.length} records`, 14, 23);

  if (rows.length) {
    const headers = Object.keys(rows[0]);
    autoTable(doc, {
      startY: 28,
      head: [headers],
      body: rows.map((row) => headers.map((header) => String(row[header] ?? ""))),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [5, 150, 105] },
    });
  }

  return Buffer.from(doc.output("arraybuffer"));
}

const REPORT_TITLES: Record<string, string> = {
  audit: "Audit trail",
  kyc: "KYC queue",
  login: "Login activity",
  transactions: "Transactions",
  repayments: "Repayments",
  "user-activity": "User activity",
};

export const GET = withAuth(
  async (req: NextRequest) => {
    const type = req.nextUrl.searchParams.get("type") ?? "audit";
    const format = req.nextUrl.searchParams.get("format") ?? "csv";
    const rows = await buildReportRows(type);
    const title = REPORT_TITLES[type] ?? type;
    const filename = complianceExportFilename(type, format as "csv" | "xlsx" | "pdf");

    if (format === "pdf") {
      const buffer = await buildPdfBuffer(rows, title);
      return new Response(buffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    if (type === "login" && format === "csv") {
      const logs = await prisma.loginLog.findMany({
        take: 2000,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { email: true } } },
      });
      const csv = loginLogsToCsv(
        logs.map((log) => ({
          id: log.id,
          email: log.email ?? log.user?.email ?? null,
          success: log.success,
          ipAddress: log.ipAddress,
          createdAt: log.createdAt.toISOString(),
        }))
      );
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    const content = format === "xlsx" ? rowsToExcel(rows) : rowsToCsv(rows);
    const mime =
      format === "xlsx"
        ? "application/vnd.ms-excel; charset=utf-8"
        : "text/csv; charset=utf-8";

    return new Response(content, {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  },
  { roles: ["COMPLIANCE_OFFICER"], permission: "compliance:reports" }
);
