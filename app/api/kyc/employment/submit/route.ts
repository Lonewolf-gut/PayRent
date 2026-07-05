import { NextRequest } from "next/server";
import { employmentVerifySchema } from "@/lib/validations/kyc";
import { kycService } from "@/lib/services/kyc.service";
import { apiResponse, withAuth } from "@/lib/api/handler";

function getFile(formData: FormData, key: string) {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

export const POST = withAuth(
  async (req: NextRequest, _ctx, session) => {
    const formData = await req.formData();
    const parsed = employmentVerifySchema.safeParse({
      staffId: formData.get("staffId")?.toString(),
      employerName: formData.get("employerName")?.toString() || undefined,
      occupation: formData.get("occupation")?.toString() || undefined,
    });
    if (!parsed.success) {
      return apiResponse(null, 400, parsed.error.issues[0]?.message ?? "Validation failed.");
    }

    const employmentLetter = getFile(formData, "employmentLetter");
    const staffIdDocument = getFile(formData, "staffIdDocument");
    if (!employmentLetter || !staffIdDocument) {
      return apiResponse(
        null,
        400,
        "Employment letter and staff ID document are required."
      );
    }

    const result = await kycService.submitManualEmployment(
      session.user.id,
      session.user.role,
      parsed.data,
      { employmentLetter, staffIdDocument }
    );

    return apiResponse(
      result,
      200,
      "Employment documents submitted for administrator review."
    );
  },
  { permission: "kyc:manage" }
);
