import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import type { Prisma, PropertyType } from "@prisma/client";
import { NextRequest } from "next/server";
import { propertyFilterSchema, propertySchema } from "@/lib/validations/property";
import { propertyRepository } from "@/lib/repositories/property.repository";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { apiResponse, withAuth, withPublicHandler } from "@/lib/api/handler";
import { subscriptionService } from "@/lib/services/subscription.service";
import { notificationService } from "@/lib/services/notification.service";
import {
  FREE_PLAN_LIMITS,
  RESIDENTIAL_TYPES,
  getPropertyCategory,
  isUnlimitedPlan,
} from "@/lib/subscription-limits";
import { AppError } from "@/lib/errors";

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

async function getBrowsePlan(userId?: string | null) {
  if (!userId) return "FREE" as const;
  const sub = await subscriptionService.getCurrent(userId);
  return sub?.plan ?? "FREE";
}

async function fetchLimitedProperties(filters: {
  search?: string;
  propertyType?: string;
  minRent?: number;
  maxRent?: number;
  location?: string;
  page: number;
  limit: number;
}) {
  const baseWhere: Prisma.PropertyWhereInput = {
    status: "ACTIVE",
    ...(filters.propertyType && {
      propertyType: filters.propertyType as PropertyType,
    }),
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
      take: FREE_PLAN_LIMITS.residential,
      orderBy: [{ isPremium: "desc" }, { createdAt: "desc" }],
    }),
    prisma.property.findMany({
      where: { ...baseWhere, propertyType: "CAR" },
      include,
      take: FREE_PLAN_LIMITS.cars,
      orderBy: [{ isPremium: "desc" }, { createdAt: "desc" }],
    }),
    prisma.property.findMany({
      where: { ...baseWhere, propertyType: "APPLIANCE" },
      include,
      take: FREE_PLAN_LIMITS.appliances,
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
      FREE_PLAN_LIMITS.total
    ),
    page: filters.page,
    limit: filters.limit,
    planLimited: true,
  };
}

async function assertListingLimit(userId: string, propertyType: PropertyType) {
  const sub = await subscriptionService.getCurrent(userId);
  if (isUnlimitedPlan(sub?.plan)) return;

  const landlord = await prisma.landlord.findUnique({ where: { userId } });
  if (!landlord) throw new AppError("Landlord profile required", 403);

  const existing = await prisma.property.findMany({
    where: { landlordId: landlord.id, status: { not: "INACTIVE" } },
    select: { propertyType: true },
  });

  const counts = {
    residential: 0,
    car: 0,
    appliance: 0,
    total: existing.length,
  };

  for (const property of existing) {
    const category = getPropertyCategory(property.propertyType);
    counts[category] += 1;
  }

  if (counts.total >= FREE_PLAN_LIMITS.total) {
    throw new AppError(
      "Free plan limit reached: maximum 20 total listings. Upgrade to Premium for unlimited access.",
      403
    );
  }

  const category = getPropertyCategory(propertyType);
  if (category === "residential" && counts.residential >= FREE_PLAN_LIMITS.residential) {
    throw new AppError(
      "Free plan limit reached: maximum 10 property listings. Upgrade to Premium for unlimited access.",
      403
    );
  }
  if (category === "car" && counts.car >= FREE_PLAN_LIMITS.cars) {
    throw new AppError(
      "Free plan limit reached: maximum 5 car listings. Upgrade to Premium for unlimited access.",
      403
    );
  }
  if (category === "appliance" && counts.appliance >= FREE_PLAN_LIMITS.appliances) {
    throw new AppError(
      "Free plan limit reached: maximum 5 appliance listings. Upgrade to Premium for unlimited access.",
      403
    );
  }
}

async function notifyAdminsListingSubmitted(propertyName: string, landlordEmail: string) {
  const admins = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "CEO"] } },
    select: { id: true },
  });
  await Promise.all(
    admins.map((admin: { id: string }) =>
      notificationService.create({
        userId: admin.id,
        title: "New listing pending review",
        body: `${landlordEmail} submitted "${propertyName}" for verification.`,
      })
    )
  );
}

export const GET = withPublicHandler(async (req: NextRequest) => {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = propertyFilterSchema.safeParse(params);
  const filters = parsed.success ? parsed.data : propertyFilterSchema.parse({});

  const session = await auth();
  const plan = await getBrowsePlan(session?.user?.id);

  if (!isUnlimitedPlan(plan)) {
    const limited = await fetchLimitedProperties(filters);
    return apiResponse(limited);
  }

  const result = await propertyRepository.findMany(filters);
  return apiResponse(result);
});

export const POST = withAuth(
  async (req, _ctx, session) => {
    let parsed;
    let images: File[] = [];
    let video: File | null = null;

    if (req.headers.get("content-type")?.includes("multipart/form-data")) {
      const formData = await req.formData();
      const payload = {
        name: formData.get("name")?.toString() ?? "",
        propertyType: formData.get("propertyType")?.toString() ?? "",
        monthlyRent: Number(formData.get("monthlyRent") ?? 0),
        annualRent: Number(formData.get("annualRent") ?? 0),
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
      const maybeVideo = formData.get("video");
      if (maybeVideo instanceof File && maybeVideo.name) {
        video = maybeVideo;
      }
    } else {
      const body = await req.json();
      parsed = propertySchema.safeParse(body);
    }

    if (!parsed.success) {
      return apiResponse({ error: parsed.error.flatten() }, 400);
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

    const propertyData: Prisma.PropertyCreateInput = {
      ...parsed.data,
      monthlyRent: parsed.data.monthlyRent,
      annualRent: parsed.data.annualRent,
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

    if (video) {
      propertyData.videos = {
        create: [
          {
            url: await saveUploadedFile(video, "videos"),
            title: video.name,
          },
        ],
      };
    }

    const property = await propertyRepository.create(propertyData);

    await notifyAdminsListingSubmitted(parsed.data.name, session.user.email);

    await notificationService.create({
      userId: session.user.id,
      title: "Listing submitted",
      body: `Your listing "${parsed.data.name}" has been submitted and is pending admin review.`,
      channel: "EMAIL",
      sendEmail: true,
    });

    return apiResponse(property, 201);
  },
  { roles: ["LANDLORD"], permission: "property:create" }
);
