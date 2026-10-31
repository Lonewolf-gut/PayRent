import { prisma } from "@/lib/db/prisma";
import type { Prisma, WalletType } from "@prisma/client";

export class WalletRepository {
  async findByUserAndType(userId: string, type: WalletType) {
    return prisma.wallet.findFirst({ where: { userId, type } });
  }

  async findById(id: string) {
    return prisma.wallet.findUnique({
      where: { id },
      include: { transactions: { take: 20, orderBy: { createdAt: "desc" } } },
    });
  }

  async create(data: Prisma.WalletCreateInput) {
    return prisma.wallet.create({ data });
  }

  async updateBalance(id: string, balance: Prisma.Decimal) {
    return prisma.wallet.update({ where: { id }, data: { balance } });
  }

  async getTransactions(walletId: string, skip = 0, take = 20) {
    return prisma.walletTransaction.findMany({
      where: { walletId },
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: { commissionRecord: true },
    });
  }

  async getPlatformWallet() {
    return prisma.wallet.findFirst({ where: { type: "PLATFORM" } });
  }
}

export const walletRepository = new WalletRepository();
