import { Prisma, WalletType, TransactionType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { walletRepository } from "@/lib/repositories/wallet.repository";
import { commissionService } from "@/lib/services/commission.service";
import { AppError } from "@/lib/errors";
import { v4 as uuidv4 } from "uuid";

export class WalletService {
  async getOrCreateWallet(userId: string, type: WalletType) {
    let wallet = await walletRepository.findByUserAndType(userId, type);
    if (!wallet) {
      wallet = await walletRepository.create({
        user: { connect: { id: userId } },
        type,
        balance: 0,
      });
    }
    return wallet;
  }

  async deposit(
    userId: string,
    type: WalletType,
    amount: number,
    description?: string
  ) {
    if (amount <= 0) throw new AppError("Amount must be positive");

    const wallet = await this.getOrCreateWallet(userId, type);
    const fees = commissionService.calculateFees(amount);
    const netAmount = amount - fees.totalFee;
    const reference = `DEP-${uuidv4().slice(0, 8).toUpperCase()}`;

    return prisma.$transaction(async (tx) => {
      const updated = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: netAmount } },
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "DEPOSIT",
          status: "COMPLETED",
          amount: new Prisma.Decimal(amount),
          fee: new Prisma.Decimal(fees.totalFee),
          commission: new Prisma.Decimal(fees.commissionFee),
          netAmount: new Prisma.Decimal(netAmount),
          reference,
          description: description ?? "Wallet deposit",
        },
      });

      await this.creditPlatformWallet(tx, fees.totalFee, transaction.id);
      return { wallet: updated, transaction };
    });
  }

  async transfer(
    fromUserId: string,
    fromType: WalletType,
    toUserId: string,
    toType: WalletType,
    amount: number,
    description?: string
  ) {
    if (amount <= 0) throw new AppError("Amount must be positive");

    const fromWallet = await this.getOrCreateWallet(fromUserId, fromType);
    const toWallet = await this.getOrCreateWallet(toUserId, toType);

    if (Number(fromWallet.balance) < amount) {
      throw new AppError("Insufficient balance", 400, "INSUFFICIENT_FUNDS");
    }

    const fees = commissionService.calculateFees(amount);
    const netAmount = amount - fees.totalFee;
    const reference = `TRF-${uuidv4().slice(0, 8).toUpperCase()}`;

    return prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: fromWallet.id },
        data: { balance: { decrement: amount } },
      });

      const updatedTo = await tx.wallet.update({
        where: { id: toWallet.id },
        data: { balance: { increment: netAmount } },
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: fromWallet.id,
          type: "TRANSFER",
          status: "COMPLETED",
          amount: new Prisma.Decimal(amount),
          fee: new Prisma.Decimal(fees.totalFee),
          commission: new Prisma.Decimal(fees.commissionFee),
          netAmount: new Prisma.Decimal(netAmount),
          reference,
          description: description ?? "Wallet transfer",
          counterpartyId: toWallet.id,
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: toWallet.id,
          type: "DEPOSIT",
          status: "COMPLETED",
          amount: new Prisma.Decimal(netAmount),
          fee: 0,
          commission: 0,
          netAmount: new Prisma.Decimal(netAmount),
          reference: `${reference}-IN`,
          description: `Transfer from ${fromType}`,
        },
      });

      await this.creditPlatformWallet(tx, fees.totalFee, transaction.id);
      return { wallet: updatedTo, transaction };
    });
  }

  private async creditPlatformWallet(
    tx: Prisma.TransactionClient,
    feeAmount: number,
    sourceTransactionId: string
  ) {
    let platform = await tx.wallet.findFirst({ where: { type: "PLATFORM" } });
    if (!platform) {
      platform = await tx.wallet.create({
        data: { type: "PLATFORM", balance: 0 },
      });
    }

    await tx.wallet.update({
      where: { id: platform.id },
      data: { balance: { increment: feeAmount } },
    });

    const fees = commissionService.calculateFees(feeAmount);
    await tx.commission.create({
      data: {
        transactionId: sourceTransactionId,
        serviceFee: new Prisma.Decimal(fees.serviceFee),
        commissionFee: new Prisma.Decimal(fees.commissionFee),
        processingFee: new Prisma.Decimal(fees.processingFee),
        totalFee: new Prisma.Decimal(feeAmount),
      },
    });
  }

  async getBalance(userId: string, type: WalletType) {
    const wallet = await this.getOrCreateWallet(userId, type);
    return {
      balance: wallet.balance,
      currency: wallet.currency,
      walletId: wallet.id,
    };
  }

  async withdraw(
    userId: string,
    type: WalletType,
    amount: number,
    description?: string
  ) {
    if (amount <= 0) throw new AppError("Amount must be positive");

    const wallet = await this.getOrCreateWallet(userId, type);
    if (Number(wallet.balance) < amount) {
      throw new AppError("Insufficient balance", 400, "INSUFFICIENT_FUNDS");
    }

    const fees = commissionService.calculateFees(amount);
    const netAmount = amount;
    const reference = `WDR-${uuidv4().slice(0, 8).toUpperCase()}`;

    return prisma.$transaction(async (tx) => {
      const updated = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount } },
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "WITHDRAWAL",
          status: "COMPLETED",
          amount: new Prisma.Decimal(amount),
          fee: new Prisma.Decimal(fees.totalFee),
          commission: new Prisma.Decimal(fees.commissionFee),
          netAmount: new Prisma.Decimal(netAmount - fees.totalFee),
          reference,
          description: description ?? "Bank withdrawal",
        },
      });

      await this.creditPlatformWallet(tx, fees.totalFee, transaction.id);
      return { wallet: updated, transaction };
    });
  }

  async getHistory(userId: string, type: WalletType, page = 1, limit = 20) {
    const wallet = await this.getOrCreateWallet(userId, type);
    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      walletRepository.getTransactions(wallet.id, skip, limit),
      prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
    ]);
    return { transactions, total, page, limit };
  }
}

export const walletService = new WalletService();
