import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { userRepository } from "@/lib/repositories/user.repository";
import { apiResponse, withAuth } from "@/lib/api/handler";
import { buildAdminUsersWhere } from "@/lib/admin/users-query";
import type { UserRole } from "@prisma/client";

export const GET = withAuth(
  async (req: NextRequest) => {
    const role = req.nextUrl.searchParams.get("role") as UserRole | null;
    const search = req.nextUrl.searchParams.get("search")?.trim();
    const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10);
    const limit = 20;
    const skip = (page - 1) * limit;

    const where = buildAdminUsersWhere({ role, search });

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          lockedUntil: true,
          failedLoginCount: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return apiResponse({ users, total, page, limit });
  },
  { roles: ["ADMIN"], permission: "admin:users" }
);

export const PATCH = withAuth(
  async (req: NextRequest, _ctx, session) => {
    const body = await req.json();
    const userId = body?.userId as string | undefined;
    const isActive = body?.isActive as boolean | undefined;
    const unlock = body?.unlock as boolean | undefined;
    const role = body?.role as UserRole | undefined;

    if (!userId) {
      return apiResponse({ error: "User id is required" }, 400, "User id is required");
    }

    if (userId === session.user.id && isActive === false) {
      return apiResponse(
        { error: "You cannot suspend your own account" },
        400,
        "You cannot suspend your own account"
      );
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, email: true },
    });

    if (!target) {
      return apiResponse({ error: "User not found" }, 404, "User not found");
    }

    if (target.role === "ADMIN" && isActive === false) {
      return apiResponse(
        { error: "Admin accounts cannot be suspended" },
        403,
        "Admin accounts cannot be suspended"
      );
    }

    if (role && role !== target.role) {
      const assignableRoles: UserRole[] = ["COMPLIANCE_OFFICER", "BUYER", "MERCHANT", "MARKETER", "LENDER"];
      if (!assignableRoles.includes(role)) {
        return apiResponse({ error: "This role cannot be assigned here" }, 400, "Invalid role");
      }
      if (target.role === "ADMIN") {
        return apiResponse({ error: "Admin role cannot be changed" }, 403, "Admin role cannot be changed");
      }
      if (userId === session.user.id) {
        return apiResponse({ error: "You cannot change your own role" }, 400, "You cannot change your own role");
      }
    }

    const data: {
      isActive?: boolean;
      lockedUntil?: null;
      failedLoginCount?: number;
      role?: UserRole;
    } = {};
    if (typeof isActive === "boolean") data.isActive = isActive;
    if (unlock) {
      data.lockedUntil = null;
      data.failedLoginCount = 0;
    }
    if (role && role !== target.role) {
      data.role = role;
    }

    if (!Object.keys(data).length) {
      return apiResponse({ error: "No changes provided" }, 400, "No changes provided");
    }

    const user = await userRepository.update(userId, data);
    return apiResponse(user);
  },
  { roles: ["ADMIN"], permission: "admin:users" }
);

export const DELETE = withAuth(
  async (req: NextRequest, _ctx, session) => {
    const body = await req.json();
    const userId = body?.userId as string | undefined;

    if (!userId) {
      return apiResponse({ error: "User id is required" }, 400, "User id is required");
    }

    if (userId === session.user.id) {
      return apiResponse(
        { error: "You cannot delete your own account" },
        400,
        "You cannot delete your own account"
      );
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, email: true },
    });

    if (!target) {
      return apiResponse({ error: "User not found" }, 404, "User not found");
    }

    if (target.role === "ADMIN") {
      return apiResponse(
        { error: "Admin accounts cannot be deleted" },
        403,
        "Admin accounts cannot be deleted"
      );
    }

    await userRepository.deleteById(userId);
    return apiResponse({ deleted: true, email: target.email });
  },
  { roles: ["ADMIN"], permission: "admin:users" }
);
