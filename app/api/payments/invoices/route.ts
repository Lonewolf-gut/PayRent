import { apiResponse, withAuth } from "@/lib/api/handler";
import { prisma } from "@/lib/db/prisma";

export const GET = withAuth(async (_req, _ctx, session) => {
  const invoices = await prisma.paymentInvoice.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      invoiceNumber: true,
      kind: true,
      status: true,
      amount: true,
      currency: true,
      paymentMethod: true,
      description: true,
      paidAt: true,
      createdAt: true,
      propertyId: true,
      reddeClientReference: true,
    },
  });

  return apiResponse(invoices);
});
