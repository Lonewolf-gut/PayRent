import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(
  async (_req: NextRequest, ctx) => {
    const { id } = await ctx.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        image: true,
        isActive: true,
        twoFactorEnabled: true,
        failedLoginCount: true,
        lockedUntil: true,
        createdAt: true,
        updatedAt: true,
        tenant: { select: { fullName: true, kycVerified: true, profileStatus: true } },
        landlord: { select: { fullName: true, identityVerified: true, profileStatus: true } },
        lender: { select: { fullName: true, kycVerified: true, profileStatus: true } },
        agentProfile: { select: { fullName: true } },
        verifications: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { id: true, type: true, status: true, createdAt: true },
        },
        wallets: { select: { id: true, type: true, balance: true, currency: true } },
        subscriptions: {
          orderBy: { createdAt: "desc" },
          take: 3,
          select: { id: true, plan: true, status: true, endDate: true },
        },
        loginLogs: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { id: true, success: true, ipAddress: true, createdAt: true },
        },
      },
    });

    if (!user) {
      return apiResponse({ error: "User not found" }, 404, "User not found");
    }

    const properties =
      user.role === "MERCHANT"
        ? await prisma.property.findMany({
            where: { landlord: { userId: id } },
            select: { id: true, name: true, status: true, createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 10,
          })
        : [];

    return apiResponse({ ...user, properties });
  },
  { roles: ["ADMIN"], permission: "admin:users" }
);
