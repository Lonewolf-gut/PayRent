import { NextRequest } from "next/server";
import { z } from "zod";
import { bankApiService, assertBankPartnerAuth } from "@/lib/services/payment/bank-api.service";
import { apiError, apiResponse } from "@/lib/api/handler";
import { prisma } from "@/lib/db/prisma";
import { getWalletTypeForRole } from "@/lib/wallet/role-wallet";

const depositSchema = z.object({
  userId: z.string().cuid(),
  amount: z.number().positive(),
  reference: z.string().min(6),
  bankCode: z.string().optional(),
  description: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    assertBankPartnerAuth(req);
    const parsed = depositSchema.safeParse(await req.json());
    if (!parsed.success) {
      return apiResponse({ error: "Invalid deposit payload" }, 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: { role: true },
    });
    if (!user) {
      return apiResponse({ error: "User not found" }, 404);
    }

    const walletType = getWalletTypeForRole(user.role);
    if (!walletType) {
      return apiResponse({ error: "User role cannot receive deposits" }, 400);
    }

    const result = await bankApiService.deposit({
      userId: parsed.data.userId,
      walletType,
      amount: parsed.data.amount,
      reference: parsed.data.reference,
      bankCode: parsed.data.bankCode,
      description: parsed.data.description,
    });

    return apiResponse(result, result.alreadyProcessed ? 200 : 201);
  } catch (error) {
    return apiError(error);
  }
}
