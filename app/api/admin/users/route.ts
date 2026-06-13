import { NextRequest } from "next/server";
import { userRepository } from "@/lib/repositories/user.repository";
import { prisma } from "@/lib/db/prisma";
import { apiResponse, withAuth } from "@/lib/api/handler";
import type { UserRole } from "@prisma/client";

export const GET = withAuth(
  async (req: NextRequest) => {
    const role = req.nextUrl.searchParams.get("role") as UserRole | null;
    const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10);
    const limit = 20;

    const users = role
      ? await userRepository.listByRole(role, (page - 1) * limit, limit)
      : await prisma.user.findMany({
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        });

    const total = await userRepository.countByRole(role ?? undefined);
    return apiResponse({ users, total, page, limit });
  },
  { roles: ["ADMIN", "CEO"], permission: "admin:users" }
);
