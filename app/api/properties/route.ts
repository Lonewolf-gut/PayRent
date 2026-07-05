import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import type { Prisma, PropertyType } from "@prisma/client";
import { NextRequest } from "next/server";
import { propertyFilterSchema, propertySchema, normalizePropertyPayload, parseOptionalFormNumber } from "@/lib/validations/property";
import { propertyRepository } from "@/lib/repositories/property.repository";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { apiResponse, withAuth, withPublicHandler } from "@/lib/api/handler";
import {
  getUserDisplayName,
  notifyAllAdminsInAppAndEmail,
  notifyUserInAppAndEmail,
} from "@/lib/services/verification-notifications";
import {
  getPlanLimits,
  RESIDENTIAL_TYPES,
  isUnlimitedPlan,
} from "@/lib/subscription-limits";
import { assertLandlordListingLimit } from "@/lib/subscription/listing-access";
import { getSubscriptionAccess } from "@/lib/subscription/access";
import { roleHasFreePlatformAccess } from "@/lib/subscription/roles";
import { assignAgentToProperty } from "@/lib/services/agent-assignment.service";
import { firstZodIssueMessage } from "@/lib/validations/auth";

const saveUploadedFile = async (file: File, folder: string) => {
  const mimeMatch = file.type.match(/\/([a-z0-9]+)(?:;|$)/i);
  const extension = mimeMatch ? `.${mimeMatch[1]}` : path.extname(file.name) || "";
  const fileName = `${Date.now()}-${randomUUID()}${extension}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "properties", folder);
  await fs.mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);
  return `/uploads/properties/${folder}/${fileName}`;
};

async function getBrowsePlan(userId?: string | null, role?: string | null) {
  if (!userId) return "FREE" as const;
  if (role && roleHasFreePlatformAccess(role as "TENANT" | "LANDLORD" | "AGENT" | "LENDER" | "ADMIN")) {
    return "MAX" as const;
  }
  const access = await getSubscriptionAccess(userId);
  if (access.hasFullAccess && !access.isPaid) return "MAX" as const;
  return access.plan;
}

async function fetchLimitedProperties(
  filters: {
  search?: string;
  propertyType?: string;
  category?: "residential" | "car" | "appliance";
  minRent?: number;
  maxRent?: number;
  location?: string;
  page: number;
  limit: number;
},
  plan?: string | null
) {
  const limits = getPlanLimits(plan ?? "FREE") ?? getPlanLimits("FREE")!;
  const categoryTypeFilter =
    filters.propertyType
      ? { propertyType: filters.propertyType as PropertyType }
      : filters.category === "car"
        ? { propertyType: "CAR" as PropertyType }
        : filters.category === "appliance"
          ? { propertyType: "APPLIANCE" as PropertyType }
          : filters.category === "residential"
            ? { propertyType: { in: RESIDENTIAL_TYPES } }
            : {};

  const baseWhere: Prisma.PropertyWhereInput = {
    status: "ACTIVE",
    ...categoryTypeFilter,
    ...(filters.minRent && { monthlyRent: { gte: filters.minRent } }),
    ...(filters.maxRent && { monthlyRent: { lte: filters.maxRent } }),
    ...(filters.location && {
      location: { contains: filters.location, mode: "insensitive" },
    }),
    ...(filters.search && {
      OR: [
        { name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
        { location: { contains: filters.search, mode: "insensitive" } },
      ],
    }),
  };

  const include = {
    images: { take: 1, orderBy: { order: "asc" as const } },
    agent: true,
  };

  const [residential, cars, appliances] = await Promise.all([
    prisma.property.findMany({
      where: { ...baseWhere, propertyType: { in: RESIDENTIAL_TYPES } },
      include,
      take: limits.residential,
      orderBy: [{ isPremium: "desc" }, { createdAt: "desc" }],
    }),
    prisma.property.findMany({
      where: { ...baseWhere, propertyType: "CAR" },
      include,
      take: limits.cars,
      orderBy: [{ isPremium: "desc" }, { createdAt: "desc" }],
    }),
    prisma.property.findMany({
      where: { ...baseWhere, propertyType: "APPLIANCE" },
      include,
      take: limits.appliances,
      orderBy: [{ isPremium: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  const items = [...residential, ...cars, ...appliances].slice(
    (filters.page - 1) * filters.limit,
    filters.page * filters.limit
  );

  return {
    items,
    total: Math.min(
      residential.length + cars.length + appliances.length,
      limits.total
    ),
    page: filters.page,
    limit: filters.limit,
    planLimited: true,
  };
}

async function assertListingLimit(userId: string, propertyType: PropertyType) {
  await assertLandlordListingLimit(userId, propertyType);
}

export const GET = withPublicHandler(async (req: NextRequest) => {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = propertyFilterSchema.safeParse(params);
  const filters = parsed.success ? parsed.data : propertyFilterSchema.parse({});

  const session = await auth();
  const plan = await getBrowsePlan(session?.user?.id, session?.user?.role);

  if (!isUnlimitedPlan(plan)) {
    const limited = await fetchLimitedProperties(filters, plan);
    return apiResponse(limited);
  }

  const result = await propertyRepository.findMany(filters);
  return apiResponse(result);
});

export const POST = withAuth(
  async (req, _ctx, session) => {
    let parsed;
    let images: File[] = [];
    let agentProfileId: string | undefined;

    if (req.headers.get("content-type")?.includes("multipart/form-data")) {
      const formData = await req.formData();
      agentProfileId = formData.get("agentUserId")?.toString() || undefined;
      const discountedRaw = formData.get("discountedPrice");
      const payload = {
        name: formData.get("name")?.toString() ?? "",
        propertyType: formData.get("propertyType")?.toString() ?? "",
        monthlyRent: Number(formData.get("monthlyRent") ?? 0),
        annualRent: parseOptionalFormNumber(formData.get("annualRent")),
        discountedPrice: parseOptionalFormNumber(discountedRaw),
        location: formData.get("location")?.toString() ?? "",
        latitude: formData.get("latitude") ? Number(formData.get("latitude")) : undefined,
        longitude: formData.get("longitude") ? Number(formData.get("longitude")) : undefined,
        description: formData.get("description")?.toString() ?? "",
        availableFrom: formData.get("availableFrom")?.toString(),
        amenities: undefined,
      };

      parsed = propertySchema.safeParse(payload);
      images = formData.getAll("images").filter(
        (value): value is File => value instanceof File && Boolean(value.name)
      );
    } else {
      const body = await req.json();
      agentProfileId = body.agentUserId;
      parsed = propertySchema.safeParse(body);
    }

    if (!parsed.success) {
      return apiResponse(
        { error: parsed.error.flatten() },
        400,
        firstZodIssueMessage(
          parsed.error,
          "Please review your listing details and try again."
        )
      );
    }

    const landlord = await prisma.landlord.findUnique({
      where: { userId: session.user.id },
    });
    if (!landlord) {
      return apiResponse({ error: "Landlord profile required" }, 403);
    }

    await assertListingLimit(
      session.user.id,
      parsed.data.propertyType as PropertyType
    );

    const normalized = normalizePropertyPayload(parsed.data);

    const propertyData: Prisma.PropertyCreateInput = {
      name: normalized.name,
      propertyType: normalized.propertyType,
      monthlyRent: normalized.monthlyRent,
      annualRent: normalized.annualRent,
      discountedPrice: normalized.discountedPrice ?? undefined,
      location: normalized.location,
      latitude: normalized.latitude,
      longitude: normalized.longitude,
      description: normalized.description,
      amenities: normalized.amenities ?? [],
      availableFrom: normalized.availableFrom
        ? new Date(normalized.availableFrom)
        : undefined,
      landlord: { connect: { id: landlord.id } },
      status: "PENDING_VERIFICATION",
    };

    if (images.length > 0) {
      propertyData.images = {
        create: await Promise.all(
          images.slice(0, 10).map(async (file, index) => ({
            url: await saveUploadedFile(file, "images"),
            alt: `Property photo ${index + 1}`,
            order: index,
          }))
        ),
      };
    }

    const property = await propertyRepository.create(propertyData);

    if (agentProfileId) {
      await assignAgentToProperty(property.id, agentProfileId, session.user.id);
    }

    const landlordName = await getUserDisplayName(session.user.id);

    await notifyAllAdminsInAppAndEmail(
      "New listing pending review",
      `${landlordName} (${session.user.email}) submitted "${parsed.data.name}" for verification.`
    );

    await notifyUserInAppAndEmail(
      session.user.id,
      "Listing submitted",
      `Your listing "${parsed.data.name}" has been submitted and is pending admin review.`
    );

    return apiResponse(property, 201);
  },
  { roles: ["LANDLORD"], permission: "property:create" }
);
