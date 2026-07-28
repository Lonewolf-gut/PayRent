import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { apiResponse, withAuth } from "@/lib/api/handler";
import { assignAgentToProperty } from "@/lib/services/agent-assignment.service";
import { assertPlatformAccess } from "@/lib/subscription/access";

export const GET = withAuth(
  async (_req, _ctx, session) => {
    const landlord = await prisma.landlord.findUnique({
      where: { userId: session.user.id },
    });
    if (!landlord) return apiResponse({ error: "Merchant profile required" }, 403);

    const [properties, agents] = await Promise.all([
      prisma.property.findMany({
        where: { landlordId: landlord.id },
        select: {
          id: true,
          name: true,
          status: true,
          agentUserId: true,
          assignedAgent: {
            select: {
              id: true,
              fullName: true,
              agencyName: true,
              user: { select: { email: true, phone: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.agentProfile.findMany({
        select: {
          id: true,
          fullName: true,
          agencyName: true,
          region: true,
          user: { select: { email: true, phone: true, isActive: true } },
        },
        orderBy: { fullName: "asc" },
        take: 100,
      }),
    ]);

    return apiResponse({
      properties,
      availableAgents: agents.filter((a: (typeof agents)[number]) => a.user.isActive),
    });
  },
  { roles: ["MERCHANT"], permission: "marketer:manage" }
);

const assignSchema = z.object({
  propertyId: z.string().cuid(),
  agentProfileId: z.string().cuid().nullable(),
});

export const PATCH = withAuth(
  async (req: NextRequest, _ctx, session) => {
    const parsed = assignSchema.safeParse(await req.json());
    if (!parsed.success) return apiResponse({ error: "Invalid input" }, 400);

    const landlord = await prisma.landlord.findUnique({
      where: { userId: session.user.id },
    });
    if (!landlord) return apiResponse({ error: "Merchant profile required" }, 403);

    if (parsed.data.agentProfileId) {
      await assertPlatformAccess(session.user.id, "assign an Affiliate to advertise listings");
    }

    const updated = await assignAgentToProperty(
      parsed.data.propertyId,
      parsed.data.agentProfileId,
      session.user.id
    );

    const property = await prisma.property.findUnique({
      where: { id: parsed.data.propertyId },
      select: {
        id: true,
        name: true,
        agentUserId: true,
        assignedAgent: {
          select: {
            id: true,
            fullName: true,
            agencyName: true,
            user: { select: { email: true, phone: true } },
          },
        },
      },
    });

    return apiResponse(property, 200, "Affiliate assignment updated.");
  },
  { roles: ["MERCHANT"], permission: "marketer:manage" }
);
