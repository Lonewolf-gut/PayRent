import { NextRequest } from "next/server";
import { apiResponse, withAuth } from "@/lib/api/handler";
import { verifyAndCompletePaystackPayment } from "@/lib/services/payment/paystack-completion.service";

export const GET = withAuth(async (req: NextRequest) => {
  const reference = req.nextUrl.searchParams.get("reference");
  if (!reference) {
    return apiResponse({ error: "reference query param required" }, 400);
  }

  try {
    const result = await verifyAndCompletePaystackPayment(reference);
    return apiResponse(result);
  } catch (error) {
    return apiResponse(
      {
        error: error instanceof Error ? error.message : "Payment verification failed",
      },
      400
    );
  }
});
