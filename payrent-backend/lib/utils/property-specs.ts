import type { PropertyType } from "@prisma/client";
import { isSaleListing } from "@/lib/subscription-limits";
import {
  formatAttributeValue,
  getAttributeFieldsForType,
  parseAttributesJson,
  type PropertyAttributes,
} from "@/lib/constants/property-listing";
import { formatStructuredAddress } from "@/lib/utils/property-location";

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
  LAND: "Land",
  CAR: "Vehicle",
  APPLIANCE: "Electronics",
};

export function buildPropertySpecs(property: {
  propertyType: PropertyType;
  region?: string | null;
  city?: string | null;
  area?: string | null;
  street?: string | null;
  houseNumber?: string | null;
  digitalAddress?: string | null;
  landmark?: string | null;
  location: string;
  monthlyRent: unknown;
  annualRent?: unknown;
  discountedPrice?: unknown;
  availableFrom?: Date | string | null;
  amenities?: string[];
  attributes?: unknown;
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

  const attributes = parseAttributesJson(property.attributes) ?? {};
  const attributeFields = getAttributeFieldsForType(property.propertyType);

  for (const field of attributeFields) {
    if (field.type === "file") continue;
    const formatted = formatAttributeValue(field, attributes[field.key]);
    if (formatted) {
      specs.push({ value: formatted, label: field.label });
    }
  }

  if (isSale) {
    specs.push(
      { value: `GHS ${listPrice.toLocaleString()}`, label: "List price" },
      ...(discounted
        ? [{ value: `GHS ${discounted.toLocaleString()}`, label: "Sale price" }]
        : []),
      { value: property.status ?? "ACTIVE", label: "Availability" }
    );
  } else {
    const formattedAddress = formatStructuredAddress({
      region: property.region,
      city: property.city,
      area: property.area,
      street: property.street,
      houseNumber: property.houseNumber,
      digitalAddress: property.digitalAddress,
      landmark: property.landmark,
      address: property.location,
    });

    specs.push(
      { value: formattedAddress || property.location, label: "Location" },
      ...(property.region ? [{ value: property.region, label: "Region" }] : []),
      ...(property.city ? [{ value: property.city, label: "City" }] : []),
      ...(property.area ? [{ value: property.area, label: "Area" }] : []),
      ...(property.street ? [{ value: property.street, label: "Street" }] : []),
      ...(property.houseNumber
        ? [{ value: property.houseNumber, label: "House number" }]
        : []),
      ...(property.digitalAddress
        ? [{ value: property.digitalAddress, label: "Digital address" }]
        : []),
      ...(property.landmark ? [{ value: property.landmark, label: "Landmark" }] : []),
      { value: `GHS ${listPrice.toLocaleString()}`, label: "Monthly rent" },
      ...(annualRent
        ? [{ value: `GHS ${annualRent.toLocaleString()}`, label: "Annual rent" }]
        : []),
      ...(availableFrom ? [{ value: availableFrom, label: "Available from" }] : [])
    );
  }

  return specs;
}

export function getSurveyPlanUrl(attributes?: unknown): string | null {
  const parsed = parseAttributesJson(attributes);
  const url = parsed?.surveyPlanUrl;
  return typeof url === "string" && url ? url : null;
}

export type { PropertyAttributes };
