import { prisma } from "@/lib/db/prisma";
import type {
  BillingCycle,
  PaymentInvoiceKind,
  PaymentInvoiceStatus,
  SubscriptionPlan,
} from "@prisma/client";

function padSequence(value: number, width = 6) {
  return String(value).padStart(width, "0");
}

export async function allocateInvoiceNumber() {
  const year = new Date().getFullYear();
  const prefix = `PFM-${year}-`;

  const last = await prisma.paymentInvoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });

  let next = 1;
  if (last?.invoiceNumber) {
    const tail = last.invoiceNumber.slice(prefix.length);
    const parsed = Number.parseInt(tail, 10);
    if (Number.isFinite(parsed)) next = parsed + 1;
  }

  return `${prefix}${padSequence(next)}`;
}

export async function createPaymentInvoice(input: {
  kind: PaymentInvoiceKind;
  amount: number;
  userId: string;
  propertyId?: string | null;
  beneficiaryUserId?: string | null;
  subscriptionPlan?: SubscriptionPlan;
  billingCycle?: BillingCycle;
  paymentMethod?: string;
  reddeClientReference: string;
  reddeClientTransId: string;
  description?: string;
  metadata?: Record<string, unknown>;
}) {
  const invoiceNumber = await allocateInvoiceNumber();

  return prisma.paymentInvoice.create({
    data: {
      invoiceNumber,
      kind: input.kind,
      status: "PENDING",
      amount: input.amount,
      userId: input.userId,
      propertyId: input.propertyId ?? undefined,
      beneficiaryUserId: input.beneficiaryUserId ?? undefined,
      subscriptionPlan: input.subscriptionPlan,
      billingCycle: input.billingCycle,
      paymentMethod: input.paymentMethod,
      reddeClientReference: input.reddeClientReference,
      reddeClientTransId: input.reddeClientTransId,
      description: input.description,
      metadata: input.metadata as object | undefined,
      provider: "redde",
    },
  });
}

export async function markPaymentInvoiceStatus(
  clientReference: string,
  status: PaymentInvoiceStatus,
  extra?: {
    reddeTransactionId?: string;
    paidAt?: Date;
    metadata?: Record<string, unknown>;
  }
) {
  const existing = await prisma.paymentInvoice.findUnique({
    where: { reddeClientReference: clientReference },
  });
  if (!existing) return null;

  return prisma.paymentInvoice.update({
    where: { id: existing.id },
    data: {
      status,
      reddeTransactionId: extra?.reddeTransactionId ?? existing.reddeTransactionId,
      paidAt: extra?.paidAt ?? (status === "PAID" ? new Date() : existing.paidAt),
      metadata: extra?.metadata
        ? ({ ...(existing.metadata as object), ...extra.metadata } as object)
        : undefined,
    },
  });
}

export async function getInvoiceByReference(clientReference: string) {
  return prisma.paymentInvoice.findUnique({
    where: { reddeClientReference: clientReference },
  });
}
