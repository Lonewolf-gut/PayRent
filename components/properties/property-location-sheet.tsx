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
    latitude?: number | null;
    longitude?: number | null;
  };
}) {
  const hasCoordinates =
    property.latitude != null &&
    property.longitude != null &&
    Number.isFinite(property.latitude) &&
    Number.isFinite(property.longitude);

  const mapQuery = hasCoordinates
    ? `${property.latitude},${property.longitude}`
    : encodeURIComponent(
        [property.location, property.area, property.city, property.region, "Ghana"]
          .filter(Boolean)
          .join(", ")
      );

  const mapSrc = hasCoordinates
    ? `https://maps.google.com/maps?q=${property.latitude},${property.longitude}&z=15&output=embed`
    : `https://maps.google.com/maps?q=${mapQuery}&z=14&output=embed`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" variant="wide" className="gap-0 p-0">
        <SheetHeader className="border-b px-6 py-5 pr-14">
          <SheetTitle>Property location</SheetTitle>
          <SheetDescription>{property.name}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <div>
              <p className="font-medium">{property.location}</p>
              <p className="text-muted-foreground">
                {[property.area, property.city, property.region].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
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
