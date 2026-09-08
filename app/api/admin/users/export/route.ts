import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withAuth } from "@/lib/api/handler";
import {
  ADMIN_USER_EXPORT_SELECT,
  buildAdminUsersWhere,
  usersToCsv,
} from "@/lib/admin/users-query";
import type { UserRole } from "@prisma/client";

const MAX_EXPORT = 10_000;

export const GET = withAuth(
  async (req: NextRequest) => {
    const role = req.nextUrl.searchParams.get("role") as UserRole | null;
    const search = req.nextUrl.searchParams.get("search");
    const format = req.nextUrl.searchParams.get("format") ?? "csv";

    const where = buildAdminUsersWhere({ role, search });

    const users = await prisma.user.findMany({
      where,
      take: MAX_EXPORT,
      orderBy: { createdAt: "desc" },
      select: ADMIN_USER_EXPORT_SELECT,
    });

    if (format === "json") {
      return NextResponse.json({ success: true, data: { users, total: users.length } });
    }

    const csv = usersToCsv(users);
    const filename = `payrent-users-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  },
  { roles: ["ADMIN"], permission: "admin:users" }
);
