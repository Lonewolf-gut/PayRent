import {
  isLegacyPublicUploadPath,
  isStorageKey,
  legacyPathToStorageKey,
  normalizeStoredFileReference,
  storageKeyFromPublicUrl,
} from "@/lib/storage/keys";
import { getPublicFileUrl } from "@/lib/storage/index";

function publicMediaApiUrl(storageKey: string) {
  return `/api/files/public?key=${encodeURIComponent(storageKey)}`;
}

/**
 * Turn a stored file reference (storage key, /uploads path, S3 URL, or absolute URL)
 * into a browser-loadable URL. Uses /api/files/public so split-repo frontends
 * can proxy file reads to PayRent-Backend (works with private S3 buckets).
 */
export function resolvePublicMediaUrl(
  storedUrl: string | null | undefined
): string | null {
  if (!storedUrl?.trim()) return null;

  const trimmed = storedUrl.trim();

  if (trimmed.startsWith("/api/files/public") || trimmed.startsWith("/api/media")) {
    return trimmed;
  }

  const storageKey =
    storageKeyFromPublicUrl(trimmed) ??
    (isStorageKey(trimmed) && trimmed.startsWith("public/")
      ? trimmed
      : isLegacyPublicUploadPath(trimmed)
        ? legacyPathToStorageKey(trimmed)
        : null);

  if (storageKey?.startsWith("public/")) {
    return publicMediaApiUrl(storageKey);
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  const normalized = normalizeStoredFileReference(trimmed);
  if (isStorageKey(normalized) && normalized.startsWith("public/")) {
    return publicMediaApiUrl(normalized);
  }

  if (isLegacyPublicUploadPath(trimmed)) {
    return `/api/files/public?path=${encodeURIComponent(trimmed)}`;
  }

  if (trimmed.startsWith("uploads/")) {
    return `/api/files/public?path=${encodeURIComponent(`/${trimmed}`)}`;
  }

  const uploadPath = getPublicFileUrl(normalized);
  if (uploadPath?.startsWith("/uploads/")) {
    return `/api/files/public?path=${encodeURIComponent(uploadPath)}`;
  }

  if (uploadPath?.startsWith("http://") || uploadPath?.startsWith("https://")) {
    const key = storageKeyFromPublicUrl(uploadPath);
    if (key?.startsWith("public/")) return publicMediaApiUrl(key);
    return uploadPath;
  }

  return null;
}

export function withResolvedPropertyImages<
  T extends { images?: Array<{ url: string }> | null },
>(property: T): T {
  if (!property.images?.length) return property;

  return {
    ...property,
    images: property.images.map((image) => ({
      ...image,
      url: resolvePublicMediaUrl(image.url) ?? image.url,
    })),
  };
}

export function withResolvedPropertyListImages<
  T extends { images?: Array<{ url: string }> | null },
>(properties: T[]): T[] {
  return properties.map(withResolvedPropertyImages);
}

export function resolvePublicStorageKeyFromRequest(
  pathParam: string | null,
  keyParam: string | null,
  refParam?: string | null
): string | null {
  const ref = refParam?.trim();
  if (ref) {
    const fromRef = storageKeyFromPublicUrl(ref);
    if (fromRef?.startsWith("public/")) return fromRef;
    if (ref.startsWith("public/")) return ref;
    if (isLegacyPublicUploadPath(ref) || ref.startsWith("uploads/")) {
      const normalizedPath = ref.startsWith("/") ? ref : `/${ref}`;
      if (!isLegacyPublicUploadPath(normalizedPath)) return null;
      const key = legacyPathToStorageKey(normalizedPath);
      return key.startsWith("public/") ? key : null;
    }
  }

  const raw = keyParam?.trim() || pathParam?.trim();
  if (!raw) return null;

  if (keyParam?.trim()) {
    const key = normalizeStoredFileReference(keyParam.trim());
    if (key.startsWith("public/")) return key;
    return storageKeyFromPublicUrl(keyParam.trim());
  }

  const normalizedPath = pathParam!.startsWith("/")
    ? pathParam!.trim()
    : `/${pathParam!.trim()}`;

  if (!isLegacyPublicUploadPath(normalizedPath)) {
    return null;
  }

  const key = legacyPathToStorageKey(normalizedPath);
  return key.startsWith("public/") ? key : null;
}
