import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { countFailedLoginsLast24h } from "@/lib/admin/failed-login-stats";
import { kycService } from "@/lib/services/kyc.service";
import { loginLogsToCsv } from "@/lib/utils/login-export";
import { withAuth } from "@/lib/api/handler";

function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "No data";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          const text = value == null ? "" : String(value);
          return `"${text.replace(/"/g, '""')}"`;
        })
        .join(",")
    ),
  ];
  return lines.join("\n");
}

export const GET = withAuth(
  async (req: NextRequest) => {
    const type = req.nextUrl.searchParams.get("type") ?? "audit";

    let csv = "";

    if (type === "audit") {
      const logs = await prisma.auditLog.findMany({
        take: 2000,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { email: true, role: true } } },
      });
      csv = toCsv(
        logs.map((log) => ({
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
        }))
      );
    } else if (type === "kyc") {
      const reviews = await kycService.getPendingKycReviews();
      csv = toCsv(reviews as unknown as Record<string, unknown>[]);
    } else if (type === "login") {
      const logs = await prisma.loginLog.findMany({
        take: 2000,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { email: true } } },
      });
      csv = loginLogsToCsv(
        logs.map((log) => ({
          id: log.id,
          email: log.email ?? log.user?.email ?? null,
          success: log.success,
          ipAddress: log.ipAddress,
          createdAt: log.createdAt.toISOString(),
        }))
      );
      await countFailedLoginsLast24h();
    } else if (type === "transactions") {
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
      csv = toCsv(
        transactions.map((tx) => ({
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
        }))
      );
    } else if (type === "repayments") {
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
          deductionEvents: {
            orderBy: { attemptedAt: "desc" },
          },
        },
      });
      csv = toCsv(
        installments.map((inst) => ({
          installmentId: inst.id,
          instalmentNumber: inst.instalmentNumber,
          amount: inst.amount.toString(),
          amountPaid: inst.amountPaid?.toString() ?? "",
          status: inst.status,
          dueDate: inst.dueDate.toISOString(),
          paidAt: inst.paidAt?.toISOString() ?? "",
          customerEmail: inst.repaymentPlan.financing.tenant.user.email,
          propertyName: inst.repaymentPlan.financing.property.name,
          failedAttempts: inst.deductionEvents.filter((e) => e.status === "FAILED")
            .length,
        }))
      );
    } else if (type === "user-activity") {
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

      const rows = [
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
      ].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      csv = toCsv(rows.slice(0, 2000));
    } else {
      csv = "Unknown report type";
    }

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="payforme-${type}-report.csv"`,
      },
    });
  },
  { roles: ["COMPLIANCE_OFFICER"], permission: "compliance:reports" }
);
