import { prisma } from "@/lib/db/prisma";
import type { WalletType } from "@prisma/client";
import { walletRepository } from "@/lib/repositories/wallet.repository";

export async function buildMandateRegistrationPayload(
  mandateId: string,
  bankAccountId: string,
  tenantUserId: string
) {
  const mandate = await prisma.mandate.findUnique({
    where: { id: mandateId },
    include: {
      bankAccount: true,
      tenant: {
        include: {
          user: { select: { email: true, phone: true } },
        },
      },
      financingRequest: {
        include: {
          property: { select: { name: true, location: true } },
          feeDisclosure: true,
        },
      },
    },
  });

  if (!mandate) {
    throw new Error("Mandate not found");
  }

  const verification = await prisma.verification.findFirst({
    where: { userId: tenantUserId, type: "IDENTITY", status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    select: { data: true },
  });

  const identityData = verification?.data as
    | { documentType?: string; idNumber?: string; fullName?: string }
    | undefined;

  const financing = mandate.financingRequest;
  const feeDisclosure = financing?.feeDisclosure;

  return {
    mandateId: mandate.id,
    bankAccountId,
    tenantUserId,
    customer: {
      fullName: mandate.tenant.fullName,
      email: mandate.tenant.user.email,
      phone: mandate.tenant.user.phone,
      nationalId: mandate.tenant.nationalId ?? identityData?.idNumber ?? null,
      identityDocumentType: identityData?.documentType ?? "GHANA_CARD",
    },
    bankAccount: {
      bankName: mandate.bankAccount.bankName,
      bankCode: mandate.bankAccount.bankCode,
      accountNumber: mandate.bankAccount.accountNumber,
      accountName: mandate.bankAccount.accountName,
    },
    financing: financing
      ? {
          financingRequestId: financing.id,
          propertyName: financing.property.name,
          propertyLocation: financing.property.location,
          principalAmount: Number(feeDisclosure?.principalAmount ?? financing.requestedAmount),
          interestRate: feeDisclosure ? Number(feeDisclosure.interestRate) : null,
          totalRepayable: feeDisclosure ? Number(feeDisclosure.totalRepayable) : null,
          monthlyPayment: feeDisclosure ? Number(feeDisclosure.monthlyPayment) : null,
          durationMonths: financing.durationMonths,
          buyerAcceptedAt: financing.buyerAcceptedAt?.toISOString() ?? null,
        }
      : null,
    mandateType: mandate.mandateType,
    mandateSource: mandate.mandateSource,
    callbackUrl: `${process.env.NEXTAUTH_URL ?? process.env.APP_URL ?? ""}/api/bank/v1/mandates/callback`,
  };
}

export async function postBankMandateRegistration(payload: Awaited<
  ReturnType<typeof buildMandateRegistrationPayload>
>) {
  const baseUrl = process.env.BANK_API_URL?.replace(/\/$/, "");
  if (!baseUrl) {
    throw new Error("BANK_API_URL is not configured");
  }

  const response = await fetch(`${baseUrl}/mandates`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.BANK_API_KEY}`,
      "Content-Type": "application/json",
      "x-payforme-mandate-id": payload.mandateId,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Bank mandate registration failed (${response.status}): ${body}`);
  }

  return (await response.json()) as {
    reference?: string;
    status?: string;
    documentUrl?: string;
  };
}
