export function stripProfileImageVersion(image: string | null | undefined): string | null {
  if (!image) return null;
  return image.replace(/\?v=.*$/, "");
}

export function withProfileImageVersion(
  image: string | null | undefined,
  version?: number | string | Date | null
): string | null {
  const base = stripProfileImageVersion(image);
  if (!base) return null;
  if (version == null) return base;
  const v = version instanceof Date ? version.getTime() : version;
  return `${base}?v=${v}`;
}
