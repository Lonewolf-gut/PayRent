import type { Prisma } from "@prisma/client";
import {
  parseAttributesJson,
  type PropertyAttributes,
} from "@/lib/constants/property-listing";
import { buildLocationString } from "@/lib/utils/property-location";

export function parseAmenitiesField(
  raw: FormDataEntryValue | null
): string[] | undefined {
  if (raw == null) return undefined;
  const text = String(raw).trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export function parseAttributesField(
  raw: FormDataEntryValue | null
): PropertyAttributes | undefined {
  const parsed = parseAttributesJson(raw);
  return parsed ?? undefined;
}

export function cleanAttributesForDb(
  attributes?: PropertyAttributes | null
): Prisma.InputJsonValue | undefined {
  if (!attributes) return undefined;
  const cleaned: PropertyAttributes = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (value === "" || value === null || value === undefined) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    cleaned[key] = value;
  }
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

export function parseOptionalCoordinate(
  raw: FormDataEntryValue | null
): number | undefined {
  if (raw == null || String(raw).trim() === "") return undefined;
  const num = Number(raw);
  return Number.isFinite(num) ? num : undefined;
}

export function parseLocationFields(formData: FormData) {
  const region = formData.get("region")?.toString().trim() ?? "";
  const city = formData.get("city")?.toString().trim() ?? "";
  const area = formData.get("area")?.toString().trim() ?? "";
  const street = formData.get("street")?.toString().trim() ?? "";
  const houseNumber = formData.get("houseNumber")?.toString().trim() ?? "";
  const digitalAddress = formData.get("digitalAddress")?.toString().trim() ?? "";
  const landmark = formData.get("landmark")?.toString().trim() ?? "";
  const location = formData.get("location")?.toString().trim() ?? "";

  const structuredLocation = buildLocationString({
    region,
    city,
    area,
    street,
    houseNumber,
    digitalAddress,
    landmark,
    address: location,
  });

  return {
    region: region || undefined,
    city: city || undefined,
    area: area || undefined,
    street: street || undefined,
    houseNumber: houseNumber || undefined,
    digitalAddress: digitalAddress || undefined,
    landmark: landmark || undefined,
    location: structuredLocation || location || undefined,
  };
}
