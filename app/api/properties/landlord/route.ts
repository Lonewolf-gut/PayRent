import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { propertyRepository } from "@/lib/repositories/property.repository";
import { apiResponse, apiError, withAuth } from "@/lib/api/handler";
import { AppError } from "@/lib/errors";

export const GET = withAuth(
  async (_req: NextRequest, _context, session) => {
    const landlord = await prisma.landlord.findUnique({
      where: { userId: session.user.id },
    });

    if (!landlord) {
      return apiError(new AppError("Landlord profile required", 403));
    }

    const properties = await propertyRepository.findByLandlord(landlord.id);
    return apiResponse(properties);
  },
  { roles: ["LANDLORD"] }
);
