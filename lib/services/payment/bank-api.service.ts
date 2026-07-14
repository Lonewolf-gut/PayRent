import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { walletService } from "@/lib/services/wallet.service";
import { notificationService } from "@/lib/services/notification.service";
import { getWalletTypeForRole } from "@/lib/wallet/role-wallet";
import type { WalletType } from "@prisma/client";

function assertBankApiKey(req: Request) {
  const configured = process.env.BANK_API_KEY?.trim();
  if (!configured) {
    throw new AppError("Bank API is not configured", 503, "BANK_API_DISABLED");
  }

  const provided = req.headers.get("x-bank-api-key")?.trim();
  if (!provided || provided !== configured) {
    throw new AppError("Invalid bank API credentials", 401, "BANK_API_UNAUTHORIZED");
  }
}

export class BankApiService {
  async deposit(params: {
    userId: string;
    walletType: WalletType;
    amount: number;
    reference: string;
    bankCode?: string;
    description?: string;
  }) {
    const existing = await prisma.walletTransaction.findUnique({
      where: { reference: params.reference },
    });
    if (existing?.status === "COMPLETED") {
      return { alreadyProcessed: true as const, transaction: existing };
    }

    const result = await walletService.deposit(
      params.userId,
      params.walletType,
      params.amount,
      params.description ?? `Bank deposit — ${params.reference}`,
      params.reference
    );

    await notificationService.send({
      userId: params.userId,
      type: "PAYMENT_SUCCESSFUL",
      channels: ["IN_APP", "EMAIL"],
      title: "Bank deposit received",
      message: `GHS ${params.amount.toLocaleString()} has been credited to your wallet.`,
      metadata: {
        amount: params.amount,
        reference: params.reference,
        provider: "BANK_API",
        bankCode: params.bankCode,
      },
    });

    return { alreadyProcessed: false as const, transaction: result.transaction };
  }

  async withdraw(params: {
    userId: string;
    amount: number;
    bankAccountId: string;
    reference: string;
    description?: string;
  }) {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        role: true,
        bankAccounts: {
          where: { id: params.bankAccountId, isVerified: true },
          take: 1,
        },
      },
    });

    if (!user?.bankAccounts.length) {
      throw new AppError("Verified bank account required", 400);
    }

    const walletType = getWalletTypeForRole(user.role);
    if (!walletType) {
      throw new AppError("User role cannot withdraw", 400);
    }

    const existing = await prisma.walletTransaction.findUnique({
      where: { reference: params.reference },
    });
    if (existing?.status === "COMPLETED") {
      return { alreadyProcessed: true as const, transaction: existing };
    }

    const result = await walletService.withdraw(
      params.userId,
      walletType,
      params.amount,
      params.description ?? `Bank withdrawal — ${params.reference}`
    );

    await prisma.withdrawalRequest.create({
      data: {
        userId: params.userId,
        bankAccountId: params.bankAccountId,
        amount: new Prisma.Decimal(params.amount),
        status: "COMPLETED",
        processedAt: new Date(),
      },
    });

    await notificationService.send({
      userId: params.userId,
      type: "WITHDRAWAL_COMPLETED",
      channels: ["IN_APP", "EMAIL"],
      title: "Withdrawal completed",
      message: `GHS ${params.amount.toLocaleString()} has been sent to your saved bank account.`,
      metadata: {
        amount: params.amount,
        reference: params.reference,
        provider: "BANK_API",
      },
    });

    return { alreadyProcessed: false as const, transaction: result.transaction };
  }
}

export const bankApiService = new BankApiService();

export function assertBankPartnerAuth(req: Request) {
  assertBankApiKey(req);
}
