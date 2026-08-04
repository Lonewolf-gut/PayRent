import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { apiResponse, withPublicHandler } from "@/lib/api/handler";
import { kycService } from "@/lib/services/kyc.service";

export const GET = withPublicHandler(async (req: NextRequest) => {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return apiResponse([]);
  }

  const agents = await prisma.agentProfile.findMany({
    where: {
      OR: [
        { fullName: { contains: q, mode: "insensitive" } },
        { agencyName: { contains: q, mode: "insensitive" } },
        { user: { email: { contains: q, mode: "insensitive" } } },
      ],
      user: { role: "MARKETER", isActive: true },
    },
    include: {
      user: { select: { id: true, email: true, phone: true, image: true } },
    },
    take: 10,
    orderBy: { fullName: "asc" },
  });

  const eligible = [];
  for (const agent of agents) {
    const status = await kycService.getVerificationStatus(agent.user.id, "MARKETER");
    if (status.identityVerified && agent.user.image) {
      eligible.push({
        id: agent.id,
        fullName: agent.fullName,
        agencyName: agent.agencyName,
        email: agent.user.email,
        phone: agent.user.phone,
        image: agent.user.image,
      });
    }
  }

  return apiResponse(eligible);
});
