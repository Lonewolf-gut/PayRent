import type { PropertyType } from "@prisma/client";
import { isSaleListing } from "@/lib/subscription-limits";

export type PropertySpecItem = {
  value: string;
  label: string;
};

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  APARTMENT: "Apartment",
  HOUSE: "House",
  CONDO: "Condo",
  TOWNHOUSE: "Townhouse",
  STUDIO: "Studio",
  COMMERCIAL: "Commercial",
  CAR: "Vehicle",
  APPLIANCE: "Appliance",
};

export function buildPropertySpecs(property: {
  propertyType: PropertyType;
  region?: string | null;
  city?: string | null;
  area?: string | null;
  location: string;
  monthlyRent: unknown;
  annualRent?: unknown;
  discountedPrice?: unknown;
  availableFrom?: Date | string | null;
  amenities?: string[];
  status?: string;
}) {
  const isSale = isSaleListing(property.propertyType);
  const listPrice = Number(property.monthlyRent);
  const annualRent = property.annualRent != null ? Number(property.annualRent) : null;
  const discounted = property.discountedPrice != null ? Number(property.discountedPrice) : null;
  const availableFrom = property.availableFrom
    ? new Date(property.availableFrom).toLocaleDateString()
    : null;

  const specs: PropertySpecItem[] = [
    { value: PROPERTY_TYPE_LABELS[property.propertyType], label: "Category" },
  ];

  if (isSale) {
    specs.push(
      { value: `GHS ${listPrice.toLocaleString()}`, label: "List price" },
      ...(discounted
        ? [{ value: `GHS ${discounted.toLocaleString()}`, label: "Sale price" }]
        : []),
      { value: property.status ?? "ACTIVE", label: "Availability" }
    );
  } else {
    specs.push(
      { value: property.location, label: "Location" },
      ...(property.region ? [{ value: property.region, label: "Region" }] : []),
      ...(property.city ? [{ value: property.city, label: "City" }] : []),
      ...(property.area ? [{ value: property.area, label: "Area" }] : []),
      { value: `GHS ${listPrice.toLocaleString()}`, label: "Monthly rent" },
      ...(annualRent
        ? [{ value: `GHS ${annualRent.toLocaleString()}`, label: "Annual rent" }]
        : []),
      ...(availableFrom ? [{ value: availableFrom, label: "Available from" }] : [])
    );
  }

  if (property.amenities?.length) {
    specs.push({ value: String(property.amenities.length), label: "Amenities" });
  }

  return specs;
}
