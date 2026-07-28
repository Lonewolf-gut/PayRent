import { NextRequest } from "next/server";
import { z } from "zod";
import { withdrawalService } from "@/lib/services/withdrawal.service";
import { prisma } from "@/lib/db/prisma";
import { apiResponse, withAuth } from "@/lib/api/handler";
import { WITHDRAW_ROLES } from "@/lib/wallet/role-wallet";

const requestSchema = z.object({
  bankAccountId: z.string().cuid(),
  amount: z.number().positive(),
});

export const GET = withAuth(
  async (_req, _ctx, session) => {
    const requests = await prisma.withdrawalRequest.findMany({
      where: { userId: session.user.id },
      include: { bankAccount: { select: { bankName: true, accountNumber: true, accountType: true } } },
      orderBy: { createdAt: "desc" },
    });
    return apiResponse(requests);
  },
  { roles: WITHDRAW_ROLES, permission: "wallet:withdraw" }
);

export const POST = withAuth(
  async (req: NextRequest, _ctx, session) => {
    const body = await req.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return apiResponse({ error: parsed.error.flatten() }, 400);
    }

    const withdrawal = await withdrawalService.requestWithdrawal(
      session.user.id,
      session.user.role,
      parsed.data.bankAccountId,
      parsed.data.amount
    );
    return apiResponse(withdrawal, 201);
  },
  { roles: WITHDRAW_ROLES, permission: "wallet:withdraw" }
);
