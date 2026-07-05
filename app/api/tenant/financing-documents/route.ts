import { NextRequest } from "next/server";
import { z } from "zod";
import { TenantFinancingDocType } from "@prisma/client";
import { apiResponse, withAuth } from "@/lib/api/handler";
import { tenantFinancingDocService } from "@/lib/services/tenant-financing-doc.service";

export const GET = withAuth(
  async (_req, _ctx, session) => {
    const data = await tenantFinancingDocService.listForTenant(session.user.id);
    return apiResponse(data);
  },
  { roles: ["TENANT"] }
);

export const POST = withAuth(
  async (req: NextRequest, _ctx, session) => {
    const formData = await req.formData();
    const documentType = formData.get("documentType")?.toString() as TenantFinancingDocType;
    const file = formData.get("document");

    if (!(file instanceof File) || !file.name) {
      return apiResponse({ error: "Document file required" }, 400);
    }

    const parsed = z.nativeEnum(TenantFinancingDocType).safeParse(documentType);
    if (!parsed.success) {
      return apiResponse({ error: "Invalid document type" }, 400);
    }

    const doc = await tenantFinancingDocService.upload(
      session.user.id,
      parsed.data,
      file
    );
    return apiResponse(doc, 201);
  },
  { roles: ["TENANT"] }
);
