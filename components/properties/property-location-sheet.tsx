"use client";

import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatStructuredAddress } from "@/lib/utils/property-location";

export function PropertyLocationSheet({
  open,
  onOpenChange,
  property,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: {
    name: string;
    location: string;
    region?: string | null;
    city?: string | null;
    area?: string | null;
    street?: string | null;
    houseNumber?: string | null;
    digitalAddress?: string | null;
    landmark?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
}) {
  const hasCoordinates =
    property.latitude != null &&
    property.longitude != null &&
    Number.isFinite(property.latitude) &&
    Number.isFinite(property.longitude);

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

  const mapQuery = hasCoordinates
    ? `${property.latitude},${property.longitude}`
    : encodeURIComponent(formattedAddress || property.location || "Ghana");

  const mapSrc = hasCoordinates
    ? `https://maps.google.com/maps?q=${property.latitude},${property.longitude}&z=15&output=embed`
    : `https://maps.google.com/maps?q=${mapQuery}&z=14&output=embed`;

  const detailRows = [
    { label: "Region", value: property.region },
    { label: "City", value: property.city },
    { label: "Area", value: property.area },
    { label: "Street", value: property.street },
    { label: "House number", value: property.houseNumber },
    { label: "Digital address", value: property.digitalAddress },
    { label: "Landmark", value: property.landmark },
  ].filter((row) => row.value);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" variant="wide" className="gap-0 p-0">
        <SheetHeader className="border-b border-border px-6 py-5 pr-14">
          <SheetTitle>Property location</SheetTitle>
          <SheetDescription>{property.name}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <div>
              <p className="font-medium">{formattedAddress || property.location}</p>
              {hasCoordinates ? (
                <p className="text-muted-foreground">
                  GPS: {property.latitude}, {property.longitude}
                </p>
              ) : null}
            </div>
          </div>
          {detailRows.length > 0 ? (
            <dl className="grid gap-3 sm:grid-cols-2">
              {detailRows.map((row) => (
                <div key={row.label} className="rounded-md border px-3 py-2">
                  <dt className="text-xs text-muted-foreground">{row.label}</dt>
                  <dd className="text-sm font-medium">{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <div className="overflow-hidden border">
            <iframe
              title={`Map for ${property.name}`}
              src={mapSrc}
              className="h-[min(70vh,560px)] w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <Button variant="outline" className="rounded-none" asChild>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
              target="_blank"
              rel="noreferrer"
            >
              Open in Google Maps
            </a>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function PropertyLocationTrigger({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className={`rounded-none ${className ?? ""}`}
      onClick={onClick}
    >
      <MapPin className="mr-2 h-4 w-4" />
      Show location
    </Button>
  );
}
