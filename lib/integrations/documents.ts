import type { StoredFileCategory } from "@prisma/client";
import { fileStorageService } from "@/lib/services/file-storage.service";

async function saveUserDocument(
  userId: string,
  file: File,
  category: StoredFileCategory,
  related?: { relatedEntityType?: string; relatedEntityId?: string }
) {
  const stored = await fileStorageService.storeUserFile({
    userId,
    file,
    category,
    relatedEntityType: related?.relatedEntityType,
    relatedEntityId: related?.relatedEntityId,
  });
  return stored.url;
}

export async function saveApplicationDocument(
  userId: string,
  file: File,
  applicationId?: string
) {
  return saveUserDocument(userId, file, "APPLICATION", {
    relatedEntityType: "PropertyApplication",
    relatedEntityId: applicationId,
  });
}

export async function saveFinancingDocument(userId: string, file: File) {
  return saveUserDocument(userId, file, "FINANCING", {
    relatedEntityType: "Tenant",
  });
}

export async function saveKycDocument(userId: string, file: File, verificationId?: string) {
  return saveUserDocument(userId, file, "KYC", {
    relatedEntityType: verificationId ? "Verification" : undefined,
    relatedEntityId: verificationId,
  });
}

export async function saveProfileImage(userId: string, file: File) {
  return saveUserDocument(userId, file, "PROFILE");
}

export async function savePropertyImage(
  userId: string,
  file: File,
  propertyId?: string
) {
  return saveUserDocument(userId, file, "PROPERTY", {
    relatedEntityType: propertyId ? "Property" : undefined,
    relatedEntityId: propertyId,
  });
}
