import type { StoredFileCategory, UserRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors";

const MAX_BYTES: Record<StoredFileCategory, number> = {
  KYC: 15 * 1024 * 1024,
  APPLICATION: 15 * 1024 * 1024,
  FINANCING: 15 * 1024 * 1024,
  MANDATE: 15 * 1024 * 1024,
  PROFILE: 8 * 1024 * 1024,
  PROPERTY: 10 * 1024 * 1024,
};

export function storedFileUrl(fileId: string) {
  return `/api/files/${fileId}`;
}

export class FileStorageService {
  async storeUserFile(params: {
    userId: string;
    file: File;
    category: StoredFileCategory;
    relatedEntityType?: string;
    relatedEntityId?: string;
  }) {
    const maxBytes = MAX_BYTES[params.category];
    if (params.file.size > maxBytes) {
      throw new AppError(
        `File is too large. Maximum size is ${Math.round(maxBytes / (1024 * 1024))}MB.`,
        400
      );
    }

    if (params.file.size <= 0) {
      throw new AppError("File is empty.", 400);
    }

    const buffer = Buffer.from(await params.file.arrayBuffer());
    const mimeType =
      params.file.type ||
      (params.file.name.endsWith(".pdf")
        ? "application/pdf"
        : "application/octet-stream");

    const stored = await prisma.userStoredFile.create({
      data: {
        userId: params.userId,
        category: params.category,
        fileName: params.file.name,
        mimeType,
        sizeBytes: buffer.length,
        data: buffer,
        relatedEntityType: params.relatedEntityType,
        relatedEntityId: params.relatedEntityId,
      },
    });

    return {
      id: stored.id,
      url: storedFileUrl(stored.id),
    };
  }

  async getById(fileId: string) {
    return prisma.userStoredFile.findUnique({ where: { id: fileId } });
  }

  async canAccess(
    file: { id: string; userId: string; category: StoredFileCategory },
    session?: { user: { id: string; role: UserRole } } | null
  ) {
    if (session?.user.id === file.userId) {
      return true;
    }

    if (session?.user.role === "ADMIN") {
      return true;
    }

    if (
      (session?.user.role as string) === "COMPLIANCE_OFFICER" &&
      ["KYC", "FINANCING", "MANDATE", "APPLICATION"].includes(file.category)
    ) {
      return true;
    }

    if (file.category === "PROFILE" && session?.user) {
      return true;
    }

    if (file.category === "PROPERTY") {
      const url = storedFileUrl(file.id);
      const image = await prisma.propertyImage.findFirst({
        where: { url },
        include: { property: { select: { status: true } } },
      });
      if (image?.property.status === "ACTIVE") {
        return true;
      }
    }

    return false;
  }

  async deleteUserFile(fileId: string, userId: string) {
    const file = await prisma.userStoredFile.findFirst({
      where: { id: fileId, userId },
    });
    if (!file) {
      throw new AppError("File not found", 404);
    }
    await prisma.userStoredFile.delete({ where: { id: fileId } });
    return file;
  }

  async linkPropertyImagesToEntity(propertyId: string, imageUrls: string[]) {
    const fileIds = imageUrls
      .filter((url) => url.startsWith("/api/files/"))
      .map((url) => url.replace("/api/files/", ""));

    if (!fileIds.length) return;

    await prisma.userStoredFile.updateMany({
      where: { id: { in: fileIds }, category: "PROPERTY" },
      data: {
        relatedEntityType: "Property",
        relatedEntityId: propertyId,
      },
    });
  }
}

export const fileStorageService = new FileStorageService();
