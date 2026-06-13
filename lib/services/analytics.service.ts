import { prisma } from "@/lib/db/prisma";

export class AnalyticsService {
  async getCeoDashboard() {
    const [
      totalUsers,
      totalTenants,
      totalLandlords,
      totalLenders,
      totalProperties,
      activeProperties,
      totalFinancingRequests,
      pendingFinancing,
      fundedFinancing,
      totalTransactions,
      platformWallet,
      commissions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "TENANT" } }),
      prisma.user.count({ where: { role: "LANDLORD" } }),
      prisma.user.count({ where: { role: "LENDER" } }),
      prisma.property.count(),
      prisma.property.count({ where: { status: "ACTIVE" } }),
      prisma.financingRequest.count(),
      prisma.financingRequest.count({ where: { status: "PENDING" } }),
      prisma.financingRequest.count({ where: { status: "FUNDED" } }),
      prisma.walletTransaction.count({ where: { status: "COMPLETED" } }),
      prisma.wallet.findFirst({ where: { type: "PLATFORM" } }),
      prisma.commission.aggregate({ _sum: { totalFee: true } }),
    ]);

    const monthlyRevenue = await prisma.walletTransaction.aggregate({
      where: {
        status: "COMPLETED",
        createdAt: { gte: new Date(new Date().setDate(1)) },
      },
      _sum: { amount: true },
    });

    const userGrowth = await this.getMonthlyGrowth("user");
    const revenueTrend = await this.getMonthlyRevenue();
    const investmentGrowth = await this.getMonthlyInvestments();

    return {
      overview: {
        totalUsers,
        totalTenants,
        totalLandlords,
        totalLenders,
        totalProperties,
        activeProperties,
        totalFinancingRequests,
        pendingFinancing,
        fundedFinancing,
        totalTransactions,
        platformBalance: platformWallet?.balance ?? 0,
        totalCommission: commissions._sum.totalFee ?? 0,
        monthlyRevenue: monthlyRevenue._sum.amount ?? 0,
      },
      charts: {
        userGrowth,
        revenueTrend,
        investmentGrowth,
      },
    };
  }

  async getLenderDashboard(lenderId: string) {
    const investments = await prisma.investment.findMany({
      where: { lenderId: lenderId },
      include: {
        financingRequest: {
          include: {
            repaymentPlan: {
              include: { installments: true },
            },
            property: true,
          },
        },
      },
    });

    const totalInvested = investments.reduce(
      (sum, inv) => sum + Number(inv.amount),
      0
    );
    const activeInvestments = investments.filter(
      (inv) => inv.financingRequest.status === "FUNDED"
    ).length;

    let interestEarned = 0;
    let paidInstallments = 0;
    let totalInstallments = 0;

    for (const inv of investments) {
      const installments =
        inv.financingRequest.repaymentPlan?.installments ?? [];
      totalInstallments += installments.length;
      paidInstallments += installments.filter((i) => i.status === "PAID").length;
      interestEarned += installments
        .filter((i) => i.status === "PAID")
        .reduce((s, i) => s + Number(i.amount) * (Number(inv.interestRate) / 100), 0);
    }

    const roi =
      totalInvested > 0 ? (interestEarned / totalInvested) * 100 : 0;

    return {
      totalInvested,
      activeInvestments,
      interestEarned,
      roi,
      repaymentProgress:
        totalInstallments > 0
          ? (paidInstallments / totalInstallments) * 100
          : 0,
      investments,
    };
  }

  private async getMonthlyGrowth(entity: string) {
    const months = 6;
    const data = [];
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const count =
        entity === "user"
          ? await prisma.user.count({
              where: { createdAt: { gte: start, lte: end } },
            })
          : 0;

      data.push({
        month: start.toLocaleString("default", { month: "short" }),
        count,
      });
    }
    return data;
  }

  private async getMonthlyRevenue() {
    const months = 6;
    const data = [];
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const result = await prisma.walletTransaction.aggregate({
        where: {
          status: "COMPLETED",
          createdAt: { gte: start, lte: end },
        },
        _sum: { amount: true },
      });

      data.push({
        month: start.toLocaleString("default", { month: "short" }),
        revenue: Number(result._sum.amount ?? 0),
      });
    }
    return data;
  }

  private async getMonthlyInvestments() {
    const months = 6;
    const data = [];
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const result = await prisma.investment.aggregate({
        where: { createdAt: { gte: start, lte: end } },
        _sum: { amount: true },
        _count: true,
      });

      data.push({
        month: start.toLocaleString("default", { month: "short" }),
        amount: Number(result._sum.amount ?? 0),
        count: result._count,
      });
    }
    return data;
  }
}

export const analyticsService = new AnalyticsService();
