import { randomBytes } from "crypto";
import {
  Prisma,
  type MandateStatus,
  type TransactionStatus,
  type WalletType,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors";
import { walletService } from "@/lib/services/wallet.service";
import { notificationService } from "@/lib/services/notification.service";
import { repaymentService } from "@/lib/services/repayment.service";
import { getWalletTypeForRole } from "@/lib/wallet/role-wallet";
import { settlementAccountService } from "@/lib/services/payment/settlement-account.service";

function makePlatformReference(prefix: string) {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}

async function findPartnerRecord(reference: string) {
  return prisma.bankPartnerTransaction.findFirst({
    where: {
      OR: [{ platformReference: reference }, { partnerReference: reference }],
    },
  });
}

export class BankPartnerService {
  getHealth() {
    return {
      status: "ok" as const,
      version: "1.0",
      environment: process.env.NODE_ENV === "production" ? "production" : "sandbox",
      partnerApiEnabled: Boolean(process.env.BANK_API_KEY?.trim()),
    };
  }

  async createDepositInstructions(userId: string, amount: number) {
    if (amount <= 0) throw new AppError("Amount must be positive", 400);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!user) throw new AppError("User not found", 404);

    const walletType = getWalletTypeForRole(user.role);
    if (!walletType) {
      throw new AppError("User role cannot receive deposits", 400);
    }

    const collectionAccount = await settlementAccountService.requireDefaultAccount();
    const platformReference = makePlatformReference("PFM-DEP");

    const record = await prisma.bankPartnerTransaction.create({
      data: {
        direction: "INBOUND",
        type: "DEPOSIT",
        platformReference,
        status: "PENDING",
        amount: new Prisma.Decimal(amount),
        userId,
        metadata: {
          walletType,
          provider: "BANK_API",
        },
      },
    });

    return {
      reference: record.platformReference,
      amount,
      currency: "GHS",
      status: record.status,
      expiresInHours: 48,
      collectionAccount: {
        bankName: collectionAccount.bankName,
        bankCode: collectionAccount.bankCode,
        accountNumber: collectionAccount.accountNumber,
        accountName: collectionAccount.accountName,
      },
      instructions:
        "Transfer the exact amount to the collection account above. Use the reference in your transfer narration.",
    };
  }

  async processDeposit(params: {
    userId: string;
    amount: number;
    reference: string;
    partnerReference?: string;
    bankCode?: string;
    description?: string;
    status?: TransactionStatus;
  }) {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { role: true },
    });
    if (!user) throw new AppError("User not found", 404);

    const walletType = getWalletTypeForRole(user.role);
    if (!walletType) {
      throw new AppError("User role cannot receive deposits", 400);
    }

    const existingTxn = await prisma.walletTransaction.findUnique({
      where: { reference: params.reference },
    });
    if (existingTxn?.status === "COMPLETED") {
      return { alreadyProcessed: true as const, transaction: existingTxn };
    }

    const partnerRecord = await findPartnerRecord(params.reference);
    const targetStatus = params.status ?? "COMPLETED";

    if (partnerRecord) {
      if (partnerRecord.userId && partnerRecord.userId !== params.userId) {
        throw new AppError("Reference belongs to another user", 409, "DUPLICATE_REFERENCE");
      }
      if (Math.abs(Number(partnerRecord.amount) - params.amount) > 0.01) {
        throw new AppError("Amount does not match deposit instruction", 409, "AMOUNT_MISMATCH");
      }
    }

    const ledgerReference = partnerRecord?.platformReference ?? params.reference;

    if (targetStatus === "PENDING" || targetStatus === "PROCESSING") {
      const record = partnerRecord
        ? await prisma.bankPartnerTransaction.update({
            where: { id: partnerRecord.id },
            data: {
              status: targetStatus,
              partnerReference: params.partnerReference ?? partnerRecord.partnerReference,
              amount: new Prisma.Decimal(params.amount),
              userId: params.userId,
              metadata: {
                bankCode: params.bankCode,
                description: params.description,
              },
            },
          })
        : await prisma.bankPartnerTransaction.create({
            data: {
              direction: "INBOUND",
              type: "DEPOSIT",
              platformReference: ledgerReference,
              partnerReference: params.partnerReference,
              status: targetStatus,
              amount: new Prisma.Decimal(params.amount),
              userId: params.userId,
              metadata: {
                walletType,
                bankCode: params.bankCode,
                description: params.description,
                provider: "BANK_API",
              },
            },
          });

      await notificationService.send({
        userId: params.userId,
        type: "PAYMENT_SUCCESSFUL",
        channels: ["IN_APP"],
        title: "Bank deposit processing",
        message: `Your deposit of GHS ${params.amount.toLocaleString()} is being processed.`,
        metadata: {
          amount: params.amount,
          reference: record.platformReference,
          status: targetStatus,
        },
      });

      return { alreadyProcessed: false as const, status: record.status, reference: record.platformReference };
    }

    if (targetStatus === "FAILED" || targetStatus === "CANCELLED") {
      if (partnerRecord) {
        await prisma.bankPartnerTransaction.update({
          where: { id: partnerRecord.id },
          data: {
            status: targetStatus,
            partnerReference: params.partnerReference ?? partnerRecord.partnerReference,
            failureMessage: params.description,
          },
        });
      }
      return { alreadyProcessed: false as const, status: targetStatus, reference: ledgerReference };
    }

    const result = await walletService.deposit(
      params.userId,
      walletType,
      params.amount,
      params.description ?? `Bank deposit — ${ledgerReference}`,
      ledgerReference
    );

    await prisma.walletTransaction.update({
      where: { id: result.transaction.id },
      data: {
        metadata: {
          provider: "BANK_API",
          bankCode: params.bankCode,
          partnerReference: params.partnerReference,
        },
      },
    });

    if (partnerRecord) {
      await prisma.bankPartnerTransaction.update({
        where: { id: partnerRecord.id },
        data: {
          status: "COMPLETED",
          partnerReference: params.partnerReference ?? partnerRecord.partnerReference,
          walletTransactionId: result.transaction.id,
          completedAt: new Date(),
        },
      });
    } else {
      await prisma.bankPartnerTransaction.create({
        data: {
          direction: "INBOUND",
          type: "DEPOSIT",
          platformReference: ledgerReference,
          partnerReference: params.partnerReference,
          status: "COMPLETED",
          amount: new Prisma.Decimal(params.amount),
          userId: params.userId,
          walletTransactionId: result.transaction.id,
          completedAt: new Date(),
          metadata: { provider: "BANK_API", bankCode: params.bankCode },
        },
      });
    }

    await notificationService.send({
      userId: params.userId,
      type: "PAYMENT_SUCCESSFUL",
      channels: ["IN_APP", "EMAIL"],
      title: "Bank deposit received",
      message: `GHS ${params.amount.toLocaleString()} has been credited to your wallet.`,
      metadata: {
        amount: params.amount,
        reference: ledgerReference,
        provider: "BANK_API",
        bankCode: params.bankCode,
      },
    });

    return { alreadyProcessed: false as const, transaction: result.transaction };
  }

  async processWithdrawal(params: {
    userId: string;
    bankAccountId: string;
    amount: number;
    reference: string;
    partnerReference?: string;
    description?: string;
    status?: TransactionStatus;
    withdrawalRequestId?: string;
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
    if (!walletType) throw new AppError("User role cannot withdraw", 400);

    const ledgerReference = params.reference;
    const existingTxn = await prisma.walletTransaction.findUnique({
      where: { reference: ledgerReference },
    });
    if (existingTxn?.status === "COMPLETED") {
      return { alreadyProcessed: true as const, transaction: existingTxn };
    }

    const targetStatus = params.status ?? "COMPLETED";

    let partnerRecord = await findPartnerRecord(ledgerReference);
    if (!partnerRecord) {
      partnerRecord = await prisma.bankPartnerTransaction.create({
        data: {
          direction: "INBOUND",
          type: "WITHDRAWAL",
          platformReference: ledgerReference,
          partnerReference: params.partnerReference,
          status: targetStatus === "COMPLETED" ? "PROCESSING" : targetStatus,
          amount: new Prisma.Decimal(params.amount),
          userId: params.userId,
          bankAccountId: params.bankAccountId,
          withdrawalRequestId: params.withdrawalRequestId,
          metadata: { provider: "BANK_API" },
        },
      });
    }

    if (targetStatus === "PENDING" || targetStatus === "PROCESSING") {
      await prisma.bankPartnerTransaction.update({
        where: { id: partnerRecord.id },
        data: {
          status: targetStatus,
          partnerReference: params.partnerReference ?? partnerRecord.partnerReference,
        },
      });

      if (params.withdrawalRequestId) {
        await prisma.withdrawalRequest.update({
          where: { id: params.withdrawalRequestId },
          data: { status: "PROCESSING" },
        });
      }

      return { alreadyProcessed: false as const, status: targetStatus, reference: ledgerReference };
    }

    if (targetStatus === "FAILED" || targetStatus === "CANCELLED") {
      await prisma.bankPartnerTransaction.update({
        where: { id: partnerRecord.id },
        data: {
          status: targetStatus,
          failureMessage: params.description,
          partnerReference: params.partnerReference ?? partnerRecord.partnerReference,
        },
      });

      if (params.withdrawalRequestId) {
        await prisma.withdrawalRequest.update({
          where: { id: params.withdrawalRequestId },
          data: {
            status: "REJECTED",
            failureReason: params.description,
            processedAt: new Date(),
          },
        });
      }

      await notificationService.send({
        userId: params.userId,
        type: "WITHDRAWAL_COMPLETED",
        channels: ["IN_APP", "EMAIL"],
        title: "Withdrawal failed",
        message: params.description ?? "Your bank withdrawal could not be completed.",
        metadata: { reference: ledgerReference, status: targetStatus },
      });

      return { alreadyProcessed: false as const, status: targetStatus, reference: ledgerReference };
    }

    const result = await walletService.withdraw(
      params.userId,
      walletType,
      params.amount,
      params.description ?? `Bank withdrawal — ${ledgerReference}`,
      ledgerReference
    );

    await prisma.walletTransaction.update({
      where: { id: result.transaction.id },
      data: {
        metadata: {
          provider: "BANK_API",
          partnerReference: params.partnerReference,
          bankAccountId: params.bankAccountId,
        },
      },
    });

    await prisma.bankPartnerTransaction.update({
      where: { id: partnerRecord.id },
      data: {
        status: "COMPLETED",
        walletTransactionId: result.transaction.id,
        partnerReference: params.partnerReference ?? partnerRecord.partnerReference,
        completedAt: new Date(),
      },
    });

    const withdrawalUpdate = {
      status: "COMPLETED" as const,
      processedAt: new Date(),
      walletTransactionId: result.transaction.id,
      partnerReference: params.partnerReference ?? ledgerReference,
    };

    if (params.withdrawalRequestId) {
      await prisma.withdrawalRequest.update({
        where: { id: params.withdrawalRequestId },
        data: withdrawalUpdate,
      });
    } else {
      await prisma.withdrawalRequest.create({
        data: {
          userId: params.userId,
          bankAccountId: params.bankAccountId,
          amount: new Prisma.Decimal(params.amount),
          ...withdrawalUpdate,
        },
      });
    }

    await notificationService.send({
      userId: params.userId,
      type: "WITHDRAWAL_COMPLETED",
      channels: ["IN_APP", "EMAIL"],
      title: "Withdrawal completed",
      message: `GHS ${params.amount.toLocaleString()} has been sent to your saved bank account.`,
      metadata: {
        amount: params.amount,
        reference: ledgerReference,
        provider: "BANK_API",
      },
    });

    return { alreadyProcessed: false as const, transaction: result.transaction };
  }

  async getWithdrawalInstruction(withdrawalRequestId: string) {
    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalRequestId },
      include: { bankAccount: true, user: { select: { id: true, role: true } } },
    });
    if (!withdrawal) throw new AppError("Withdrawal not found", 404);

    const partnerReference =
      withdrawal.partnerReference ?? makePlatformReference("PFM-WDR");

    if (!withdrawal.partnerReference) {
      await prisma.withdrawalRequest.update({
        where: { id: withdrawal.id },
        data: { partnerReference },
      });
    }

    let partnerRecord = await prisma.bankPartnerTransaction.findUnique({
      where: { platformReference: partnerReference },
    });

    if (!partnerRecord) {
      partnerRecord = await prisma.bankPartnerTransaction.create({
        data: {
          direction: "OUTBOUND",
          type: "WITHDRAWAL",
          platformReference: partnerReference,
          status: "PROCESSING",
          amount: withdrawal.amount,
          userId: withdrawal.userId,
          bankAccountId: withdrawal.bankAccountId,
          withdrawalRequestId: withdrawal.id,
          metadata: { provider: "BANK_API" },
        },
      });
    }

    const accountNumber = withdrawal.bankAccount.accountNumber;

    return {
      withdrawalRequestId: withdrawal.id,
      reference: partnerReference,
      status: withdrawal.status,
      amount: Number(withdrawal.amount),
      currency: "GHS",
      payout: {
        accountType: withdrawal.bankAccount.accountType,
        bankCode: withdrawal.bankAccount.bankCode,
        bankName: withdrawal.bankAccount.bankName,
        accountNumber,
        accountName: withdrawal.bankAccount.accountName,
      },
      partnerTransactionId: partnerRecord.id,
    };
  }

  async updateWithdrawalStatus(
    withdrawalRequestId: string,
    input: {
      status: TransactionStatus;
      reference?: string;
      failureCode?: string;
      failureMessage?: string;
      completedAt?: string;
    }
  ) {
    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalRequestId },
    });
    if (!withdrawal) throw new AppError("Withdrawal not found", 404);

    const reference = input.reference ?? withdrawal.partnerReference;
    if (!reference) throw new AppError("Withdrawal reference missing", 400);

    return this.processWithdrawal({
      userId: withdrawal.userId,
      bankAccountId: withdrawal.bankAccountId,
      amount: Number(withdrawal.amount),
      reference,
      partnerReference: reference,
      description: input.failureMessage,
      status: input.status,
      withdrawalRequestId: withdrawal.id,
    });
  }

  async createCharge(params: {
    reference: string;
    userId: string;
    bankAccountId: string;
    amount: number;
    chargeType: "INSTALLMENT" | "INVOICE" | "MANDATE";
    installmentId?: string;
    mandateId?: string;
    description?: string;
    status?: TransactionStatus;
  }) {
    const bankAccount = await prisma.bankAccount.findFirst({
      where: { id: params.bankAccountId, userId: params.userId, isVerified: true },
    });
    if (!bankAccount) throw new AppError("Verified bank account required", 400);

    if (params.chargeType === "INSTALLMENT" && params.installmentId) {
      const installment = await prisma.installment.findUnique({
        where: { id: params.installmentId },
        include: {
          repaymentPlan: {
            include: { financing: { include: { mandate: true, tenant: true } } },
          },
        },
      });
      if (!installment) throw new AppError("Installment not found", 404);
      if (installment.repaymentPlan.financing.tenant.userId !== params.userId) {
        throw new AppError("Installment does not belong to user", 403);
      }
      const mandate = installment.repaymentPlan.financing.mandate;
      if (!mandate || mandate.status !== "ACTIVE") {
        throw new AppError("Active mandate required", 400, "MANDATE_INACTIVE");
      }
      params.mandateId = mandate.id;
    }

    const existing = await findPartnerRecord(params.reference);
    if (existing?.status === "COMPLETED") {
      return { alreadyProcessed: true as const, charge: existing };
    }

    const targetStatus = params.status ?? "PROCESSING";

    const record = existing
      ? await prisma.bankPartnerTransaction.update({
          where: { id: existing.id },
          data: {
            status: targetStatus,
            amount: new Prisma.Decimal(params.amount),
            installmentId: params.installmentId,
            mandateId: params.mandateId,
            metadata: {
              chargeType: params.chargeType,
              description: params.description,
            },
          },
        })
      : await prisma.bankPartnerTransaction.create({
          data: {
            direction: "INBOUND",
            type: "CHARGE",
            platformReference: params.reference,
            status: targetStatus,
            amount: new Prisma.Decimal(params.amount),
            userId: params.userId,
            bankAccountId: params.bankAccountId,
            installmentId: params.installmentId,
            mandateId: params.mandateId,
            metadata: {
              chargeType: params.chargeType,
              description: params.description,
              provider: "BANK_API",
            },
          },
        });

    if (targetStatus === "COMPLETED" && params.installmentId) {
      await this.completeCharge(record.platformReference, {
        providerReference: params.reference,
      });
      const updated = await prisma.bankPartnerTransaction.findUnique({
        where: { id: record.id },
      });
      return { alreadyProcessed: false as const, charge: updated };
    }

    return { alreadyProcessed: false as const, charge: record };
  }

  async completeCharge(
    reference: string,
    input?: { providerReference?: string; failureMessage?: string; status?: TransactionStatus }
  ) {
    const record = await findPartnerRecord(reference);
    if (!record || record.type !== "CHARGE") {
      throw new AppError("Charge not found", 404);
    }

    const status = input?.status ?? "COMPLETED";
    if (status === "FAILED" || status === "CANCELLED") {
      await prisma.bankPartnerTransaction.update({
        where: { id: record.id },
        data: {
          status,
          failureMessage: input?.failureMessage,
          partnerReference: input?.providerReference ?? record.partnerReference,
        },
      });

      if (record.userId) {
        await notificationService.send({
          userId: record.userId,
          type: "PAYMENT_SUCCESSFUL",
          channels: ["IN_APP", "EMAIL"],
          title: "Repayment failed",
          message: input?.failureMessage ?? "Your scheduled bank charge could not be completed.",
          metadata: { reference: record.platformReference, status },
        });
      }
      return record;
    }

    if (record.installmentId) {
      await repaymentService.recordInstallmentPayment({
        installmentId: record.installmentId,
        amountPaid: Number(record.amount),
        source: "mandate",
        providerReference: input?.providerReference ?? record.partnerReference ?? reference,
      });
    }

    const updated = await prisma.bankPartnerTransaction.update({
      where: { id: record.id },
      data: {
        status: "COMPLETED",
        partnerReference: input?.providerReference ?? record.partnerReference,
        completedAt: new Date(),
      },
    });

    if (record.userId) {
      await notificationService.send({
        userId: record.userId,
        type: "PAYMENT_SUCCESSFUL",
        channels: ["IN_APP", "EMAIL"],
        title: "Repayment received",
        message: `GHS ${Number(record.amount).toLocaleString()} was collected from your bank account.`,
        metadata: { reference: record.platformReference, installmentId: record.installmentId },
      });
    }

    return updated;
  }

  async mandateCallback(input: {
    mandateId: string;
    providerReference?: string;
    status: MandateStatus;
    activatedAt?: string;
    rejectedReason?: string;
  }) {
    const mandate = await prisma.mandate.findUnique({ where: { id: input.mandateId } });
    if (!mandate) throw new AppError("Mandate not found", 404);

    const updated = await prisma.mandate.update({
      where: { id: mandate.id },
      data: {
        status: input.status,
        providerReference: input.providerReference ?? mandate.providerReference,
        activatedAt: input.activatedAt ? new Date(input.activatedAt) : mandate.activatedAt,
        rejectedReason: input.rejectedReason ?? mandate.rejectedReason,
      },
    });

    await prisma.bankPartnerTransaction.create({
      data: {
        direction: "INBOUND",
        type: "MANDATE",
        platformReference: makePlatformReference("PFM-MND"),
        partnerReference: input.providerReference,
        status: input.status === "ACTIVE" ? "COMPLETED" : "FAILED",
        amount: new Prisma.Decimal(0),
        mandateId: mandate.id,
        userId: (
          await prisma.tenant.findUnique({
            where: { id: mandate.tenantId },
            select: { userId: true },
          })
        )?.userId,
        metadata: { mandateStatus: input.status },
        completedAt: new Date(),
      },
    });

    return updated;
  }

  async lookupUser(accountNumber: string, bankCode: string) {
    const normalized = accountNumber.replace(/\s+/g, "");
    const accounts = await prisma.bankAccount.findMany({
      where: {
        isVerified: true,
        bankCode,
        accountType: "BANK",
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            tenant: { select: { fullName: true } },
            landlord: { select: { fullName: true } },
            lender: { select: { fullName: true } },
            agentProfile: { select: { fullName: true } },
          },
        },
      },
      take: 200,
    });

    const match = accounts.find(
      (account) => account.accountNumber.replace(/\s+/g, "") === normalized
    );

    if (!match) throw new AppError("User not found for account", 404);

    const profileName =
      match.user.tenant?.fullName ??
      match.user.landlord?.fullName ??
      match.user.lender?.fullName ??
      match.user.agentProfile?.fullName ??
      match.accountName;

    return {
      userId: match.user.id,
      fullName: profileName,
      email: maskEmail(match.user.email),
      defaultBankAccountId: match.id,
    };
  }

  async getTransaction(reference: string) {
    const partner = await findPartnerRecord(reference);
    const walletTxn = await prisma.walletTransaction.findUnique({
      where: { reference: partner?.platformReference ?? reference },
    });

    if (!partner && !walletTxn) {
      throw new AppError("Transaction not found", 404);
    }

    return {
      reference: partner?.platformReference ?? walletTxn?.reference ?? reference,
      partnerReference: partner?.partnerReference ?? null,
      type: partner?.type ?? walletTxn?.type ?? null,
      status: partner?.status ?? walletTxn?.status ?? null,
      amount: partner ? Number(partner.amount) : walletTxn ? Number(walletTxn.amount) : null,
      userId: partner?.userId ?? null,
      walletTransactionId: partner?.walletTransactionId ?? walletTxn?.id ?? null,
      createdAt: partner?.createdAt ?? walletTxn?.createdAt ?? null,
      completedAt: partner?.completedAt ?? null,
      failureMessage: partner?.failureMessage ?? null,
    };
  }

  async listUserPendingTransactions(userId: string) {
    return prisma.bankPartnerTransaction.findMany({
      where: {
        userId,
        status: { in: ["PENDING", "PROCESSING"] },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }

  async handleWebhook(event: string, payload: Record<string, unknown>) {
    const reference = String(payload.reference ?? "");
    if (!reference) throw new AppError("reference is required", 400);

    switch (event) {
      case "deposit.completed":
        return this.processDeposit({
          userId: String(payload.userId),
          amount: Number(payload.amount),
          reference,
          partnerReference: payload.partnerReference
            ? String(payload.partnerReference)
            : undefined,
          bankCode: payload.bankCode ? String(payload.bankCode) : undefined,
          description: payload.description ? String(payload.description) : undefined,
          status: "COMPLETED",
        });
      case "deposit.failed":
        return this.processDeposit({
          userId: String(payload.userId),
          amount: Number(payload.amount),
          reference,
          description: payload.failureMessage ? String(payload.failureMessage) : "Deposit failed",
          status: "FAILED",
        });
      case "withdrawal.completed":
        return this.updateWithdrawalStatus(String(payload.withdrawalRequestId ?? payload.withdrawalId), {
          status: "COMPLETED",
          reference,
        });
      case "withdrawal.failed":
        return this.updateWithdrawalStatus(String(payload.withdrawalRequestId ?? payload.withdrawalId), {
          status: "FAILED",
          reference,
          failureMessage: payload.failureMessage ? String(payload.failureMessage) : "Withdrawal failed",
        });
      case "charge.completed":
        return this.completeCharge(reference, {
          providerReference: payload.partnerReference
            ? String(payload.partnerReference)
            : undefined,
          status: "COMPLETED",
        });
      case "charge.failed":
        return this.completeCharge(reference, {
          status: "FAILED",
          failureMessage: payload.failureMessage ? String(payload.failureMessage) : "Charge failed",
        });
      case "mandate.updated":
        return this.mandateCallback({
          mandateId: String(payload.mandateId),
          providerReference: payload.providerReference
            ? String(payload.providerReference)
            : undefined,
          status: String(payload.status) as MandateStatus,
          activatedAt: payload.activatedAt ? String(payload.activatedAt) : undefined,
          rejectedReason: payload.rejectedReason ? String(payload.rejectedReason) : undefined,
        });
      default:
        throw new AppError(`Unsupported webhook event: ${event}`, 400);
    }
  }
}

export const bankPartnerService = new BankPartnerService();

// Backward-compatible exports
export { assertBankPartnerAuth } from "@/lib/services/payment/bank-partner-auth";
export const bankApiService = {
  deposit: (params: {
    userId: string;
    walletType: WalletType;
    amount: number;
    reference: string;
    bankCode?: string;
    description?: string;
  }) =>
    bankPartnerService.processDeposit({
      userId: params.userId,
      amount: params.amount,
      reference: params.reference,
      bankCode: params.bankCode,
      description: params.description,
      status: "COMPLETED",
    }),
  withdraw: (params: {
    userId: string;
    amount: number;
    bankAccountId: string;
    reference: string;
    description?: string;
  }) =>
    bankPartnerService.processWithdrawal({
      userId: params.userId,
      amount: params.amount,
      bankAccountId: params.bankAccountId,
      reference: params.reference,
      description: params.description,
      status: "COMPLETED",
    }),
};
