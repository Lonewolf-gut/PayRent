import { propertySchema, parseOptionalFormNumber } from "@/lib/validations/property";
import {
  parseAmenitiesField,
  parseAttributesField,
  parseLocationFields,
  parseOptionalCoordinate,
} from "@/lib/utils/property-form";

export function buildPropertyPayloadFromFormData(formData: FormData) {
  const locationFields = parseLocationFields(formData);

  return {
    name: formData.get("name")?.toString() ?? "",
    propertyType: formData.get("propertyType")?.toString() ?? "",
    monthlyRent: Number(formData.get("monthlyRent") ?? 0),
    annualRent: parseOptionalFormNumber(formData.get("annualRent")),
    discountedPrice: parseOptionalFormNumber(formData.get("discountedPrice")),
    location: locationFields.location ?? "",
    region: locationFields.region,
    city: locationFields.city,
    area: locationFields.area,
    street: locationFields.street,
    houseNumber: locationFields.houseNumber,
    digitalAddress: locationFields.digitalAddress,
    landmark: locationFields.landmark,
    latitude: parseOptionalCoordinate(formData.get("latitude")),
    longitude: parseOptionalCoordinate(formData.get("longitude")),
    description: formData.get("description")?.toString() ?? "",
    availableFrom: formData.get("availableFrom")?.toString(),
    amenities: parseAmenitiesField(formData.get("amenities")),
    attributes: parseAttributesField(formData.get("attributes")),
  };
}

export function parsePropertyFormData(formData: FormData) {
  const payload = buildPropertyPayloadFromFormData(formData);
  return propertySchema.safeParse(payload);
}
