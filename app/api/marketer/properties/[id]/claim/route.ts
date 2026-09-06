import { NextRequest } from "next/server";
import { apiResponse, withAuth } from "@/lib/api/handler";
import { agentPropertyService } from "@/lib/services/agent-property.service";
import { AppError } from "@/lib/errors";

export const POST = withAuth(
  async (_req: NextRequest, context, session) => {
    const { id } = await context.params;
    try {
      const property = await agentPropertyService.claimListing(session.user.id, id);
      return apiResponse(property, 201, "Listing claimed for promotion.");
    } catch (error) {
      if (error instanceof AppError) {
        return apiResponse({ error: error.message }, error.statusCode);
      }
      throw error;
    }
  },
  { roles: ["MARKETER"] }
);
