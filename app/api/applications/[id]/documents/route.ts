import { NextRequest } from "next/server";
import { applicationService } from "@/lib/services/application.service";
import { saveApplicationDocument } from "@/lib/integrations/documents";
import { prisma } from "@/lib/db/prisma";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const POST = withAuth(
  async (req: NextRequest, ctx, session) => {
    const { id } = await ctx.params;
    const tenant = await prisma.tenant.findUnique({
      where: { userId: session.user.id },
    });
    if (!tenant) return apiResponse(null, 403, "Tenant profile required.");

    const formData = await req.formData();
    const file = formData.get("document");
    const documentType = String(formData.get("documentType") ?? "SUPPORTING");

    if (!(file instanceof File) || !file.name) {
      return apiResponse(null, 400, "Document file is required.");
    }

    const fileUrl = await saveApplicationDocument(file);
    const document = await applicationService.addDocument(
      id,
      tenant.id,
      file.name,
      fileUrl,
      documentType
    );

    return apiResponse(document, 201, "Document uploaded.");
  },
  { roles: ["BUYER"], permission: "application:create" }
);
