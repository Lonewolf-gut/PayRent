const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const DOCUMENT_MIME_TYPES = new Set([
  ...IMAGE_MIME_TYPES,
  "application/pdf",
]);

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
};

export type UploadKind = "image" | "document";

export function getAllowedMimeTypes(kind: UploadKind) {
  return kind === "image" ? IMAGE_MIME_TYPES : DOCUMENT_MIME_TYPES;
}

export function extensionForMime(mimeType: string) {
  return EXTENSION_BY_MIME[mimeType.toLowerCase()] ?? null;
}

export function validateUploadFile(
  file: File,
  options: { kind: UploadKind; maxBytes: number }
) {
  if (!file || file.size <= 0) {
    throw new Error("A non-empty file is required.");
  }

  if (file.size > options.maxBytes) {
    const maxMb = Math.round(options.maxBytes / (1024 * 1024));
    throw new Error(`File is too large. Maximum size is ${maxMb} MB.`);
  }

  const mimeType = (file.type || "").toLowerCase();
  const allowed = getAllowedMimeTypes(options.kind);
  if (!mimeType || !allowed.has(mimeType)) {
    throw new Error(
      options.kind === "image"
        ? "Only JPG, PNG, WEBP, or GIF images are allowed."
        : "Only PDF or image files (JPG, PNG, WEBP, GIF) are allowed."
    );
  }

  const extension = extensionForMime(mimeType);
  if (!extension) {
    throw new Error("Unsupported file type.");
  }

  return { mimeType, extension };
}
