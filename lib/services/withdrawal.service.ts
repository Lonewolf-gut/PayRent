import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { otpService } from "@/lib/services/otp.service";
import { walletService } from "@/lib/services/wallet.service";
import { notificationService } from "@/lib/services/notification.service";
import { AppError } from "@/lib/errors";
import type { WalletType, UserRole } from "@prisma/client";

const ROLE_WALLET: Partial<Record<UserRole, WalletType>> = {
  LENDER: "LENDER",
  LANDLORD: "LANDLORD",
};

export class WithdrawalService {
  async requestWithdrawal(
    userId: string,
    role: UserRole,
    bankAccountId: string,
    amount: number
  ) {
    const walletType = ROLE_WALLET[role];
    if (!walletType) throw new AppError("Role cannot withdraw");

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { bankAccounts: { where: { id: bankAccountId, isVerified: true } } },
    });

    if (!user?.phoneVerified) {
      throw new AppError("Phone verification required");
    }
    if (!user.bankAccounts.length) {
      throw new AppError("Verified bank account required");
    }

    const landlord = role === "LANDLORD"
      ? await prisma.landlord.findUnique({ where: { userId } })
      : null;
    const lender = role === "LENDER"
      ? await prisma.lender.findUnique({ where: { userId } })
      : null;

    const identityOk =
      (landlord?.identityVerified ?? false) ||
      (lender?.identityVerified ?? false);
    if (!identityOk) throw new AppError("Identity verification required");

    const balance = await walletService.getBalance(userId, walletType);
    if (Number(balance.balance) < amount) {
      throw new AppError("Insufficient balance");
    }

    const withdrawal = await prisma.withdrawalRequest.create({
      data: {
        userId,
        bankAccountId,
        amount: new Prisma.Decimal(amount),
        status: "PENDING",
      },
    });

    const otp = await otpService.create(userId, "WITHDRAWAL");

    await notificationService.create({
      userId,
      title: "Withdrawal OTP",
      body: `Your withdrawal verification code is: ${otp}. It expires in 10 minutes.`,
      channel: "EMAIL",
      sendEmail: true,
      sendSms: true,
    });

    return withdrawal;
  }

  async verifyOtp(userId: string, withdrawalId: string, code: string) {
    await otpService.verify(userId, code, "WITHDRAWAL");
    return prisma.withdrawalRequest.update({
      where: { id: withdrawalId, userId },
      data: { otpVerified: true, status: "OTP_VERIFIED" },
    });
  }

  async confirmWithdrawal(
    userId: string,
    role: UserRole,
    withdrawalId: string,
    twoFaVerified: boolean
  ) {
    if (!twoFaVerified) throw new AppError("2FA verification required");

    const withdrawal = await prisma.withdrawalRequest.findFirst({
      where: { id: withdrawalId, userId, status: "OTP_VERIFIED" },
    });
    if (!withdrawal) throw new AppError("Withdrawal not found");

    const walletType = ROLE_WALLET[role]!;
    const amount = Number(withdrawal.amount);

    await walletService.withdraw(
      userId,
      walletType,
      amount,
      "Bank withdrawal"
    );

    const updated = await prisma.withdrawalRequest.update({
      where: { id: withdrawalId },
      data: {
        twoFaVerified: true,
        status: "COMPLETED",
        processedAt: new Date(),
      },
    });

    await notificationService.create({
      userId,
      title: "Withdrawal Approved",
      body: `Your withdrawal of GHS ${amount.toLocaleString()} has been processed.`,
    });

    return updated;
  }
}

export const withdrawalService = new WithdrawalService();
