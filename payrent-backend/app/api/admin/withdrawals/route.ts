import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(
  async (req: NextRequest) => {
    const status = req.nextUrl.searchParams.get("status");
    const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10);
    const limit = 30;
    const skip = (page - 1) * limit;

    const where = status
      ? { status: status as "PENDING" | "OTP_VERIFIED" | "PROCESSING" | "COMPLETED" | "REJECTED" | "APPROVED" }
      : {};

    const [requests, total] = await Promise.all([
      prisma.withdrawalRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, email: true, role: true } },
          bankAccount: {
            select: {
              bankName: true,
              accountNumber: true,
              accountNumberMasked: true,
              accountType: true,
              accountName: true,
            },
          },
        },
      }),
      prisma.withdrawalRequest.count({ where }),
    ]);

    return apiResponse({ requests, total, page, limit });
  },
  { roles: ["ADMIN"], permission: "admin:transactions" }
);

export const PATCH = withAuth(
  async (req: NextRequest) => {
    const { withdrawalId, status, note } = await req.json();

    if (!withdrawalId || !status) {
      return apiResponse({ error: "withdrawalId and status required" }, 400, "Missing fields");
    }

    if (!["REJECTED"].includes(status)) {
      return apiResponse(
        { error: "Only REJECTED allowed for admin override" },
        400,
        "Invalid status"
      );
    }

    const withdrawal = await prisma.withdrawalRequest.update({
      where: { id: withdrawalId },
      data: {
        status: "REJECTED",
        processedAt: new Date(),
      },
      include: {
        user: { select: { id: true, email: true } },
      },
    });

    const { notificationService } = await import("@/lib/services/notification.service");
    await notificationService.create({
      userId: withdrawal.userId,
      title: "Withdrawal update",
      body: note
        ? `Your withdrawal was marked ${status.toLowerCase()}: ${note}`
        : `Your withdrawal was marked ${status.toLowerCase()}.`,
      channel: "EMAIL",
      sendEmail: true,
    });

    return apiResponse(withdrawal);
  },
  { roles: ["ADMIN"], permission: "admin:transactions" }
);
