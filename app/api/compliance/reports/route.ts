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
        take: 500,
        orderBy: { createdAt: "desc" },
      });
      csv = toCsv(logs as unknown as Record<string, unknown>[]);
    } else if (type === "kyc") {
      const reviews = await kycService.getPendingKycReviews();
      csv = toCsv(reviews as unknown as Record<string, unknown>[]);
    } else if (type === "login") {
      const logs = await prisma.loginLog.findMany({
        take: 500,
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
