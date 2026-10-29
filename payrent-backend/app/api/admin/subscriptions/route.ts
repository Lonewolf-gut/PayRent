import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { subscriptionService } from "@/lib/services/subscription.service";
import { apiResponse, withAuth } from "@/lib/api/handler";
import { handleApiError } from "@/lib/errors";

export const GET = withAuth(
  async (req: NextRequest) => {
    const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10);
    const limit = 30;
    const skip = (page - 1) * limit;
    const status = req.nextUrl.searchParams.get("status");

    const where = status ? { status: status as "ACTIVE" | "CANCELLED" | "EXPIRED" | "PAST_DUE" } : {};

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, email: true, role: true } },
        },
      }),
      prisma.subscription.count({ where }),
    ]);

    return apiResponse({ subscriptions, total, page, limit });
  },
  { roles: ["ADMIN"], permission: "admin:subscriptions" }
);

export const PATCH = withAuth(  async (req: NextRequest) => {
    try {
      const body = await req.json();
      const { action, userId, subscriptionId, days, email } = body as {
        action?: "grant" | "extend" | "cancel";
        userId?: string;
        subscriptionId?: string;
        days?: number;
        email?: string;
      };

      let targetUserId = userId;
      if (action === "grant" && email && !userId) {
        const { prisma } = await import("@/lib/db/prisma");
        const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
        if (!user) return apiResponse({ error: "User not found" }, 404, "User not found");
        targetUserId = user.id;
      }

      if (action === "grant" && targetUserId) {
        const sub = await subscriptionService.adminGrantPremium(targetUserId, days ?? 30);
        return apiResponse(sub, 200, "Premium granted");
      }

      if (action === "extend" && subscriptionId) {
        const sub = await subscriptionService.adminExtendSubscription(
          subscriptionId,
          days ?? 30
        );
        return apiResponse(sub, 200, "Subscription extended");
      }

      if (action === "cancel" && userId) {
        const sub = await subscriptionService.adminCancel(userId);
        return apiResponse(sub, 200, "Subscription cancelled");
      }

      return apiResponse({ error: "Invalid action" }, 400, "Invalid action");
    } catch (error) {
      const { message, statusCode } = handleApiError(error);
      return apiResponse({ error: message }, statusCode, message);
    }
  },
  { roles: ["ADMIN"], permission: "admin:subscriptions" }
);
