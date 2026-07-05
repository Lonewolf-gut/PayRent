import { NextRequest } from "next/server";
import { mandateExecutionService } from "@/lib/services/mandate-execution.service";
import { prisma } from "@/lib/db/prisma";
import { apiResponse } from "@/lib/api/handler";
import { authorizeCron } from "@/lib/cron/authorize";

export async function GET(req: NextRequest) {
  return POST(req);
}

export async function POST(req: NextRequest) {
  if (!authorizeCron(req)) {
    return apiResponse(null, 401, "Unauthorized.");
  }

  const dueInstallments = await prisma.installment.findMany({
    where: {
      status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
      dueDate: { lte: new Date() },
      repaymentPlan: {
        financing: {
          status: { in: ["DISBURSED", "REPAYMENT_ACTIVE", "FUNDED"] },
          mandate: { status: "ACTIVE" },
        },
      },
    },
    include: {
      repaymentPlan: { include: { financing: { include: { mandate: true } } } },
    },
    take: 50,
  });

  let processed = 0;
  for (const installment of dueInstallments) {
    const mandateId = installment.repaymentPlan.financing.mandate?.id;
    if (!mandateId) continue;
    await mandateExecutionService.executeDeduction(installment.id, mandateId);
    processed += 1;
  }

  await mandateExecutionService.retryFailedDeductions();

  const bankProcessing = await prisma.mandate.findMany({
    where: { status: "BANK_PROCESSING" },
    select: { id: true },
    take: 20,
  });

  const { mandateService } = await import("@/lib/services/mandate.service");
  for (const mandate of bankProcessing) {
    await mandateService.syncBankStatus(mandate.id);
  }

  return apiResponse(
    { deductionsProcessed: processed, mandatesPolled: bankProcessing.length },
    200,
    "Repayment and mandate jobs completed."
  );
}
