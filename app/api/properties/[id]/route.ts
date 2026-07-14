import type { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { propertyRepository } from "@/lib/repositories/property.repository";
import { apiResponse, apiError, withAuth, withPublicHandler } from "@/lib/api/handler";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/db/prisma";
import { propertySchema, normalizePropertyPayload, parseOptionalFormNumber } from "@/lib/validations/property";
import { firstZodIssueMessage } from "@/lib/validations/auth";
import { savePropertyImage } from "@/lib/integrations/documents";
import { fileStorageService } from "@/lib/services/file-storage.service";

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

    if (req.headers.get("content-type")?.includes("multipart/form-data")) {
      const formData = await req.formData();
      const payload = {
        name: formData.get("name")?.toString() ?? "",
        propertyType: formData.get("propertyType")?.toString() ?? "",
        monthlyRent: Number(formData.get("monthlyRent") ?? 0),
        annualRent: parseOptionalFormNumber(formData.get("annualRent")),
        discountedPrice: parseOptionalFormNumber(formData.get("discountedPrice")),
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
      return apiError(new AppError("Landlord profile required", 403));
    }

    const property = await prisma.property.findUnique({ where: { id } });
    if (!property || property.landlordId !== landlord.id) {
      return apiError(new AppError("Property not found", 404));
    }

    const normalized = normalizePropertyPayload(parsed.data);

    const updateData: Prisma.PropertyUpdateInput = {
      name: normalized.name,
      propertyType: normalized.propertyType,
      monthlyRent: normalized.monthlyRent,
      annualRent: normalized.annualRent,
      discountedPrice: normalized.discountedPrice,
      location: normalized.location,
      latitude: normalized.latitude,
      longitude: normalized.longitude,
      description: normalized.description,
      availableFrom: normalized.availableFrom
        ? new Date(normalized.availableFrom)
        : undefined,
    };

    let imageCreates: { url: string; alt: string; order: number }[] = [];

    if (images.length > 0) {
      imageCreates = await Promise.all(
        images.slice(0, 10).map(async (file, index) => ({
          url: await savePropertyImage(session.user.id, file, id),
          alt: `Property photo ${index + 1}`,
          order: index,
        }))
      );
      updateData.images = { create: imageCreates };
    }

    const updated = await propertyRepository.update(id, updateData);

    if (imageCreates.length > 0) {
      await fileStorageService.linkPropertyImagesToEntity(
        id,
        imageCreates.map((image) => image.url)
      );
    }

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
