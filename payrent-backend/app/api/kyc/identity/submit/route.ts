import { NextRequest } from "next/server";
import { identityVerifySchema, kybVerifySchema } from "@/lib/validations/kyc";
import { kycService } from "@/lib/services/kyc.service";
import { apiResponse, withAuth } from "@/lib/api/handler";

function getFile(formData: FormData, key: string) {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

export const POST = withAuth(
  async (req: NextRequest, _ctx, session) => {
    const formData = await req.formData();
    const entityType = (formData.get("entityType")?.toString() ?? "INDIVIDUAL") as
      | "INDIVIDUAL"
      | "COMPANY";

    if (entityType === "COMPANY") {
      const parsed = kybVerifySchema.safeParse({
        entityType: "COMPANY",
        companyName: formData.get("companyName")?.toString(),
        companyRegistrationNumber: formData.get("companyRegistrationNumber")?.toString(),
        companyRegisteredAddress: formData.get("companyRegisteredAddress")?.toString(),
        companyTin: formData.get("companyTin")?.toString() || undefined,
        fullName: formData.get("fullName")?.toString(),
      });
      if (!parsed.success) {
        return apiResponse(null, 400, parsed.error.issues[0]?.message ?? "Validation failed.");
      }

      const companyRegistration = getFile(formData, "companyRegistration");
      if (!companyRegistration) {
        return apiResponse(null, 400, "Company registration certificate is required.");
      }

      const result = await kycService.submitManualKyb(
        session.user.id,
        session.user.role,
        parsed.data,
        {
          companyRegistration,
          companyTin: getFile(formData, "companyTinDoc"),
        }
      );

      return apiResponse(result, 200, "Company documents submitted for administrator review.");
    }

    const parsed = identityVerifySchema.safeParse({
      entityType: "INDIVIDUAL",
      documentType: formData.get("documentType")?.toString() ?? "GHANA_CARD",
      idNumber: formData.get("idNumber")?.toString(),
      fullName: formData.get("fullName")?.toString(),
      dateOfBirth: formData.get("dateOfBirth")?.toString() || undefined,
    });
    if (!parsed.success) {
      return apiResponse(null, 400, parsed.error.issues[0]?.message ?? "Validation failed.");
    }

    const idFront = getFile(formData, "idFront");
    const idBack = getFile(formData, "idBack");
    const facePhoto = getFile(formData, "facePhoto");
    if (!idFront || !idBack || !facePhoto) {
      return apiResponse(
        null,
        400,
        "ID front, ID back, and face photo uploads are required."
      );
    }

    const result = await kycService.submitManualIdentity(
      session.user.id,
      session.user.role,
      parsed.data,
      { idFront, idBack, facePhoto }
    );

    return apiResponse(result, 200, "Identity documents submitted for administrator review.");
  },
  { roles: ["BUYER", "MERCHANT", "LENDER", "MARKETER"], permission: "kyc:manage" }
);
