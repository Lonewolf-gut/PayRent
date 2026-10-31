import { Prisma, type WalletType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { walletService } from "@/lib/services/wallet.service";
import { settlementAccountService } from "@/lib/services/payment/settlement-account.service";
import { AppError } from "@/lib/errors";

export type TreasuryFlowType =
  | "SUBSCRIPTION"
  | "FINANCING_DISBURSEMENT"
  | "DIRECT_PURCHASE"
  | "MANDATE_REPAYMENT"
  | "AGENT_COMMISSION"
  | "ROLE_WITHDRAWAL"
  | "DEPOSIT";

type TreasuryAllocationMetadata = {
  treasuryFlow: TreasuryFlowType;
  collectionAccountId: string;
  beneficiaryUserId: string;
  beneficiaryWalletType: WalletType;
  sourceUserId?: string | null;
  sourceWalletType?: WalletType | null;
  financingRequestId?: string | null;
  buyerUserId?: string | null;
  onBehalfOfCustomer?: boolean;
  propertyName?: string | null;
};

export class TreasuryService {
  private async requireCollectionAccount() {
    return settlementAccountService.requireDefaultAccount();
  }

  async recordTreasuryMovement(input: {
    platformReference: string;
    amount: number;
    flow: TreasuryFlowType;
    beneficiaryUserId: string;
    beneficiaryWalletType: WalletType;
    sourceUserId?: string | null;
    sourceWalletType?: WalletType | null;
    financingRequestId?: string | null;
    buyerUserId?: string | null;
    onBehalfOfCustomer?: boolean;
    propertyName?: string | null;
    mandateId?: string | null;
    installmentId?: string | null;
  }) {
    const collectionAccount = await this.requireCollectionAccount();
    const metadata: TreasuryAllocationMetadata = {
      treasuryFlow: input.flow,
      collectionAccountId: collectionAccount.id,
      beneficiaryUserId: input.beneficiaryUserId,
      beneficiaryWalletType: input.beneficiaryWalletType,
      sourceUserId: input.sourceUserId ?? null,
      sourceWalletType: input.sourceWalletType ?? null,
      financingRequestId: input.financingRequestId ?? null,
      buyerUserId: input.buyerUserId ?? null,
      onBehalfOfCustomer: input.onBehalfOfCustomer ?? false,
      propertyName: input.propertyName ?? null,
    };

    const existing = await prisma.bankPartnerTransaction.findUnique({
      where: { platformReference: input.platformReference },
    });
    if (existing) return existing;

    return prisma.bankPartnerTransaction.create({
      data: {
        direction: "INBOUND",
        type:
          input.flow === "MANDATE_REPAYMENT"
            ? "CHARGE"
            : input.flow === "ROLE_WITHDRAWAL"
              ? "WITHDRAWAL"
              : input.flow === "FINANCING_DISBURSEMENT"
                ? "MANDATE"
                : "DEPOSIT",
        platformReference: input.platformReference,
        status: "COMPLETED",
        amount: new Prisma.Decimal(input.amount),
        userId: input.beneficiaryUserId,
        mandateId: input.mandateId ?? null,
        installmentId: input.installmentId ?? null,
        completedAt: new Date(),
        metadata,
      },
    });
  }

  async disburseFinancing(params: {
    financingRequestId: string;
    reference: string;
    lenderUserId: string;
    merchantUserId: string;
    buyerUserId: string;
    propertyName: string;
    principalAmount: number;
    merchantNet: number;
    agentUserId?: string | null;
    agentCommission?: number;
  }) {
    if (params.principalAmount <= 0) {
      throw new AppError("Financing amount must be positive", 400);
    }

    const lenderBalance = await walletService.getBalance(params.lenderUserId, "LENDER");
    if (Number(lenderBalance.balance) < params.principalAmount) {
      throw new AppError(
        "Insufficient lender wallet balance. Top up your wallet before financing this listing.",
        400
      );
    }

    await this.recordTreasuryMovement({
      platformReference: params.reference,
      amount: params.principalAmount,
      flow: "FINANCING_DISBURSEMENT",
      beneficiaryUserId: params.merchantUserId,
      beneficiaryWalletType: "MERCHANT",
      sourceUserId: params.lenderUserId,
      sourceWalletType: "LENDER",
      financingRequestId: params.financingRequestId,
      buyerUserId: params.buyerUserId,
      onBehalfOfCustomer: true,
      propertyName: params.propertyName,
    });

    await walletService.transfer(
      params.lenderUserId,
      "LENDER",
      params.merchantUserId,
      "MERCHANT",
      params.merchantNet,
      `Financing disbursement for ${params.propertyName} (customer purchase)`
    );

    if (params.agentUserId && (params.agentCommission ?? 0) > 0) {
      const commissionReference = `${params.reference}-AGT`;
      await this.recordTreasuryMovement({
        platformReference: commissionReference,
        amount: params.agentCommission!,
        flow: "AGENT_COMMISSION",
        beneficiaryUserId: params.agentUserId,
        beneficiaryWalletType: "MARKETER",
        sourceUserId: params.merchantUserId,
        sourceWalletType: "MERCHANT",
        financingRequestId: params.financingRequestId,
        buyerUserId: params.buyerUserId,
        onBehalfOfCustomer: true,
        propertyName: params.propertyName,
      });

      await walletService.transfer(
        params.merchantUserId,
        "MERCHANT",
        params.agentUserId,
        "MARKETER",
        params.agentCommission!,
        `Agent commission for financing: ${params.propertyName}`
      );
    }
  }
}

export const treasuryService = new TreasuryService();
