import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { propertyRepository } from "@/lib/repositories/property.repository";
import { notificationService } from "@/lib/services/notification.service";
import { apiResponse, withAuth } from "@/lib/api/handler";

export const GET = withAuth(
  async (req: NextRequest) => {
    const status = req.nextUrl.searchParams.get("status");
    const properties = await prisma.property.findMany({
      where: status ? { status: status as "PENDING_VERIFICATION" | "ACTIVE" | "DRAFT" } : undefined,
      include: {
        landlord: { include: { user: { select: { email: true, id: true } } } },
        images: true,
        videos: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return apiResponse(properties);
  },
  { roles: ["ADMIN", "CEO"], permission: "admin:properties" }
);

export const PATCH = withAuth(
  async (req: NextRequest) => {
    const { propertyId, status } = await req.json();
    const existing = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { landlord: { include: { user: { select: { id: true } } } } },
    });

    const property = await propertyRepository.updateStatus(propertyId, status);

    if (existing && status === "ACTIVE" && existing.status !== "ACTIVE") {
      await notificationService.create({
        userId: existing.landlord.user.id,
        title: "Listing approved",
        body: `Your listing "${existing.name}" is now active on the marketplace.`,
        channel: "EMAIL",
        sendEmail: true,
      });
    }

    return apiResponse(property);
  },
  { roles: ["ADMIN", "CEO"], permission: "admin:properties" }
);
