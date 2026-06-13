import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { propertyRepository } from "@/lib/repositories/property.repository";
import { apiResponse, apiError, withAuth, withPublicHandler } from "@/lib/api/handler";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/db/prisma";
import { propertySchema } from "@/lib/validations/property";

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

export const GET = withPublicHandler(async (_req, context) => {
  const { id } = await context.params;
  const property = await propertyRepository.findById(id);
  if (!property) return apiError(new AppError("Property not found", 404));
  return apiResponse(property);
});

export const PATCH = withAuth(
  async (req: NextRequest, context, session) => {
    const { id } = await context.params;
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
      images = formData.getAll("images").filter((value): value is File => value instanceof File && value.name);
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
      return apiError(new AppError("Landlord profile required", 403));
    }

    const property = await prisma.property.findUnique({ where: { id } });
    if (!property || property.landlordId !== landlord.id) {
      return apiError(new AppError("Property not found", 404));
    }

    const updateData: Prisma.PropertyUpdateInput = {
      ...parsed.data,
      monthlyRent: parsed.data.monthlyRent,
      annualRent: parsed.data.annualRent,
    };

    if (images.length > 0) {
      updateData.images = {
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
      updateData.videos = {
        create: [
          {
            url: await saveUploadedFile(video, "videos"),
            title: video.name,
          },
        ],
      };
    }

    const updated = await propertyRepository.update(id, updateData);

    return apiResponse(updated);
  },
  { roles: ["LANDLORD"], permission: "property:update" }
);

export const DELETE = withAuth(
  async (_req: NextRequest, context, session) => {
    const { id } = await context.params;

    const landlord = await prisma.landlord.findUnique({
      where: { userId: session.user.id },
    });

    if (!landlord) {
      return apiError(new AppError("Landlord profile required", 403));
    }

    const property = await prisma.property.findUnique({ where: { id } });
    if (!property || property.landlordId !== landlord.id) {
      return apiError(new AppError("Property not found", 404));
    }

    await prisma.property.delete({ where: { id } });
    return apiResponse({ ok: true });
  },
  { roles: ["LANDLORD"], permission: "property:create" }
);
