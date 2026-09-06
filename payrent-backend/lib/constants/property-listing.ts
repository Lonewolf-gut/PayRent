import type { PropertyType } from "@prisma/client";

export const RESIDENTIAL_AMENITIES = [
  "Parking",
  "Security",
  "CCTV",
  "Wi-Fi",
  "Air Conditioning",
  "Ceiling Fans",
  "Swimming Pool",
  "Gym",
  "Elevator",
  "Garden",
  "Balcony",
  "Water Tank",
  "Borehole",
  "Backup Generator",
  "Solar Power",
  "Children's Playground",
  "Laundry Area",
  "Furnished",
  "Semi-furnished",
  "Smart Home",
] as const;

export const COMMERCIAL_AMENITIES = [
  "Parking",
  "Security",
  "Generator",
  "Fibre Internet",
  "Elevator",
  "Reception",
  "Meeting Room",
  "Air Conditioning",
  "Kitchen",
  "Fire Alarm",
  "Emergency Exit",
] as const;

export const COMMERCIAL_SUITABLE_FOR = [
  "Office",
  "Shop",
  "Restaurant",
  "Pharmacy",
  "Warehouse",
  "School",
  "Church",
] as const;

export type AttributeFieldType =
  | "number"
  | "text"
  | "boolean"
  | "select"
  | "multiselect"
  | "file";

export type AttributeFieldConfig = {
  key: string;
  label: string;
  type: AttributeFieldType;
  placeholder?: string;
  options?: readonly string[];
  unit?: string;
  min?: number;
};

export const RESIDENTIAL_ATTRIBUTE_FIELDS: AttributeFieldConfig[] = [
  { key: "bedrooms", label: "Number of bedrooms", type: "number", min: 0 },
  { key: "bathrooms", label: "Number of bathrooms", type: "number", min: 0 },
  { key: "toilets", label: "Toilets", type: "number", min: 0 },
  { key: "kitchens", label: "Kitchens", type: "number", min: 0 },
  { key: "livingRooms", label: "Living rooms", type: "number", min: 0 },
  {
    key: "propertySize",
    label: "Property size",
    type: "number",
    min: 0,
    unit: "sqm",
    placeholder: "e.g. 120",
  },
  {
    key: "landSize",
    label: "Land size",
    type: "number",
    min: 0,
    unit: "sqm",
    placeholder: "e.g. 500",
  },
  { key: "floorNumber", label: "Floor number", type: "number", min: 0 },
  { key: "totalFloors", label: "Total floors", type: "number", min: 1 },
  {
    key: "furnished",
    label: "Furnished",
    type: "select",
    options: ["Yes", "No"],
  },
  { key: "newlyBuilt", label: "Newly built", type: "boolean" },
  { key: "petsAllowed", label: "Pets allowed", type: "boolean" },
  { key: "smokingAllowed", label: "Smoking allowed", type: "boolean" },
  { key: "sharedApartment", label: "Shared apartment", type: "boolean" },
  { key: "utilitiesIncluded", label: "Utilities included", type: "boolean" },
];

export const COMMERCIAL_ATTRIBUTE_FIELDS: AttributeFieldConfig[] = [
  {
    key: "officeSize",
    label: "Office size",
    type: "number",
    min: 0,
    unit: "sqm",
  },
  {
    key: "shopSize",
    label: "Shop size",
    type: "number",
    min: 0,
    unit: "sqm",
  },
  {
    key: "warehouseSize",
    label: "Warehouse size",
    type: "number",
    min: 0,
    unit: "sqm",
  },
  { key: "rooms", label: "Number of rooms", type: "number", min: 0 },
  { key: "parkingSpaces", label: "Parking spaces", type: "number", min: 0 },
  { key: "receptionArea", label: "Reception area", type: "boolean" },
  { key: "conferenceRooms", label: "Conference rooms", type: "number", min: 0 },
  { key: "loadingBay", label: "Loading bay", type: "boolean" },
  {
    key: "suitableFor",
    label: "Suitable for",
    type: "multiselect",
    options: COMMERCIAL_SUITABLE_FOR,
  },
];

export const LAND_ATTRIBUTE_FIELDS: AttributeFieldConfig[] = [
  {
    key: "plotSize",
    label: "Plot size",
    type: "number",
    min: 0,
    unit: "sqm",
  },
  { key: "numberOfPlots", label: "Number of plots", type: "number", min: 1 },
  { key: "landTitle", label: "Land title", type: "text", placeholder: "e.g. Freehold" },
  { key: "registered", label: "Registered", type: "boolean" },
  { key: "litigationStatus", label: "Litigation status", type: "select", options: ["None", "Pending", "Resolved"] },
  { key: "roadAccess", label: "Road access", type: "boolean" },
  { key: "waterAccess", label: "Water access", type: "boolean" },
  { key: "electricityAvailable", label: "Electricity available", type: "boolean" },
  {
    key: "surveyPlanUrl",
    label: "Survey plan",
    type: "file",
  },
];

export const VEHICLE_ATTRIBUTE_FIELDS: AttributeFieldConfig[] = [
  { key: "brand", label: "Brand", type: "text", placeholder: "e.g. Toyota" },
  { key: "model", label: "Model", type: "text", placeholder: "e.g. Camry" },
  { key: "year", label: "Year", type: "number", min: 1900 },
  {
    key: "transmission",
    label: "Transmission",
    type: "select",
    options: ["Automatic", "Manual"],
  },
  {
    key: "fuelType",
    label: "Fuel type",
    type: "select",
    options: ["Petrol", "Diesel", "Electric", "Hybrid", "LPG"],
  },
  { key: "mileage", label: "Mileage", type: "number", min: 0, unit: "km" },
  { key: "engineSize", label: "Engine size", type: "text", placeholder: "e.g. 2.0L" },
  { key: "color", label: "Color", type: "text" },
  {
    key: "condition",
    label: "Condition",
    type: "select",
    options: ["New", "Used", "Certified Pre-owned"],
  },
  {
    key: "registrationStatus",
    label: "Registration status",
    type: "select",
    options: ["Registered", "Unregistered", "Expired"],
  },
  { key: "insuranceValidity", label: "Insurance validity", type: "text", placeholder: "e.g. Valid until Dec 2026" },
];

export const ELECTRONICS_ATTRIBUTE_FIELDS: AttributeFieldConfig[] = [
  { key: "brand", label: "Brand", type: "text" },
  { key: "model", label: "Model", type: "text" },
  {
    key: "condition",
    label: "Condition",
    type: "select",
    options: ["New", "Used", "Refurbished"],
  },
  { key: "warranty", label: "Warranty", type: "text", placeholder: "e.g. 12 months" },
  { key: "storageCapacity", label: "Storage capacity", type: "text", placeholder: "e.g. 256GB" },
  { key: "ram", label: "RAM", type: "text", placeholder: "e.g. 8GB" },
  { key: "color", label: "Color", type: "text" },
  { key: "screenSize", label: "Screen size", type: "text", placeholder: 'e.g. 6.7"' },
  { key: "powerRating", label: "Power rating", type: "text", placeholder: "e.g. 65W" },
];

const RESIDENTIAL_PROPERTY_TYPES: PropertyType[] = [
  "APARTMENT",
  "HOUSE",
  "CONDO",
  "TOWNHOUSE",
  "STUDIO",
];

export function isResidentialPropertyType(type: PropertyType) {
  return RESIDENTIAL_PROPERTY_TYPES.includes(type);
}

export type ListingProfile =
  | "residential"
  | "commercial"
  | "land"
  | "vehicle"
  | "electronics";

export function getListingProfile(type: PropertyType): ListingProfile {
  if (type === "COMMERCIAL") return "commercial";
  if (type === "LAND") return "land";
  if (type === "CAR") return "vehicle";
  if (type === "APPLIANCE") return "electronics";
  return "residential";
}

export function getAmenitiesForType(type: PropertyType): readonly string[] {
  const profile = getListingProfile(type);
  if (profile === "commercial") return COMMERCIAL_AMENITIES;
  if (profile === "residential" || profile === "land") return RESIDENTIAL_AMENITIES;
  return [];
}

export function getAttributeFieldsForType(
  type: PropertyType
): AttributeFieldConfig[] {
  switch (getListingProfile(type)) {
    case "commercial":
      return COMMERCIAL_ATTRIBUTE_FIELDS;
    case "land":
      return LAND_ATTRIBUTE_FIELDS;
    case "vehicle":
      return VEHICLE_ATTRIBUTE_FIELDS;
    case "electronics":
      return ELECTRONICS_ATTRIBUTE_FIELDS;
    default:
      return RESIDENTIAL_ATTRIBUTE_FIELDS;
  }
}

export type PropertyAttributes = Record<string, string | number | boolean | string[]>;

export function emptyAttributesForType(type: PropertyType): PropertyAttributes {
  const fields = getAttributeFieldsForType(type);
  const attrs: PropertyAttributes = {};
  for (const field of fields) {
    if (field.type === "boolean") attrs[field.key] = false;
    else if (field.type === "multiselect") attrs[field.key] = [];
    else if (field.type === "number") attrs[field.key] = "";
    else attrs[field.key] = "";
  }
  return attrs;
}

export function parseAttributesJson(
  raw: unknown
): PropertyAttributes | null {
  if (raw == null) return null;
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as PropertyAttributes;
  }
  if (typeof raw === "string" && raw.trim()) {
    try {
      return JSON.parse(raw) as PropertyAttributes;
    } catch {
      return null;
    }
  }
  return null;
}

export function formatAttributeValue(
  field: AttributeFieldConfig,
  value: unknown
): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (field.type === "boolean") return value === true || value === "true" ? "Yes" : "No";
  if (field.type === "multiselect" && Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : null;
  }
  if (field.type === "file" && typeof value === "string") {
    return value ? "Uploaded" : null;
  }
  const str = String(value);
  if (field.unit && field.type === "number" && str) {
    return `${str} ${field.unit}`;
  }
  return str || null;
}
