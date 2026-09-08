export type StorageDriver = "local" | "s3";

export type StorageVisibility = "private" | "public";

export function getStorageDriver(): StorageDriver {
  const value = (process.env.STORAGE_DRIVER ?? "local").trim().toLowerCase();
  return value === "s3" ? "s3" : "local";
}

export function isS3StorageConfigured() {
  return Boolean(
    process.env.S3_BUCKET?.trim() &&
      process.env.S3_REGION?.trim() &&
      process.env.S3_ACCESS_KEY_ID?.trim() &&
      process.env.S3_SECRET_ACCESS_KEY?.trim()
  );
}

export function getMaxUploadBytes() {
  const mb = Number(process.env.FILE_MAX_SIZE_MB ?? "10");
  if (!Number.isFinite(mb) || mb <= 0) return 10 * 1024 * 1024;
  return Math.floor(mb * 1024 * 1024);
}

export function getSignedUrlTtlSeconds() {
  const seconds = Number(process.env.FILE_SIGNED_URL_TTL_SECONDS ?? "900");
  if (!Number.isFinite(seconds) || seconds < 60) return 900;
  return Math.min(seconds, 3600);
}

export function getPublicAssetBaseUrl() {
  const configured = process.env.S3_PUBLIC_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const bucket = process.env.S3_BUCKET?.trim();
  const region = process.env.S3_REGION?.trim();
  if (bucket && region) {
    return `https://${bucket}.s3.${region}.amazonaws.com`;
  }

  return "";
}
