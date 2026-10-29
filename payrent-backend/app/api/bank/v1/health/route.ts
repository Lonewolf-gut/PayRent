import { apiResponse } from "@/lib/api/handler";
import { bankPartnerService } from "@/lib/services/payment/bank-partner.service";

export async function GET() {
  return apiResponse(bankPartnerService.getHealth());
}
