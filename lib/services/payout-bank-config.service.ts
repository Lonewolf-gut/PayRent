import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors";
import type { PayoutBankProvider } from "@/lib/constants/allowed-payout-banks";

export type AdminPayoutBank = {
  id: string;
  name: string;
  paystackCode: string;
  resolveCode: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

function toAdminPayoutBank(row: {
  id: string;
  name: string;
  paystackCode: string;
  resolveCode: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}): AdminPayoutBank {
  return {
    id: row.id,
    name: row.name,
    paystackCode: row.paystackCode,
    resolveCode: row.resolveCode,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class PayoutBankConfigService {
  async listActiveProviders(): Promise<PayoutBankProvider[]> {
    try {
      const rows = await prisma.payoutBankConfig.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      });

      return rows.map((row) => ({
        code: row.paystackCode.trim(),
        name: row.name.trim(),
        resolveCode: (row.resolveCode ?? row.paystackCode).trim(),
        alternateResolveCodes: row.resolveCode
          ? [row.paystackCode.trim()].filter((code) => code !== (row.resolveCode ?? "").trim())
          : undefined,
      }));
    } catch {
      return [];
    }
  }

  async listAll(): Promise<AdminPayoutBank[]> {
    try {
      const rows = await prisma.payoutBankConfig.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      });
      return rows.map(toAdminPayoutBank);
    } catch {
      return [];
    }
  }

  async create(
    input: {
      name: string;
      paystackCode: string;
      resolveCode?: string | null;
      sortOrder?: number;
    },
    createdByUserId?: string
  ): Promise<AdminPayoutBank> {
    const name = input.name.trim();
    const paystackCode = input.paystackCode.trim();
    const resolveCode = input.resolveCode?.trim() || null;

    if (!name || !paystackCode) {
      throw new AppError("Bank name and Paystack code are required.", 400);
    }

    const existing = await prisma.payoutBankConfig.findUnique({
      where: { paystackCode },
    });
    if (existing) {
      throw new AppError("A bank with this Paystack code already exists.", 409);
    }

    const row = await prisma.payoutBankConfig.create({
      data: {
        name,
        paystackCode,
        resolveCode,
        sortOrder: input.sortOrder ?? 0,
        createdByUserId: createdByUserId ?? null,
      },
    });

    return toAdminPayoutBank(row);
  }

  async remove(id: string): Promise<void> {
    const existing = await prisma.payoutBankConfig.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError("Bank not found.", 404);
    }

    await prisma.payoutBankConfig.delete({ where: { id } });
  }
}

export const payoutBankConfigService = new PayoutBankConfigService();
