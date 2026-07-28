"use client";

import { cn } from "@/lib/utils";
import { getAmenitiesForType } from "@/lib/constants/property-listing";
import type { PropertyType } from "@prisma/client";

type Props = {
  propertyType: PropertyType;
  selected: string[];
  onChange: (amenities: string[]) => void;
  disabled?: boolean;
};

export function PropertyAmenityChips({
  propertyType,
  selected,
  onChange,
  disabled,
}: Props) {
  const options = getAmenitiesForType(propertyType);

  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Amenities are available for residential and commercial listings.
      </p>
    );
  }

  function toggle(amenity: string) {
    if (disabled) return;
    if (selected.includes(amenity)) {
      onChange(selected.filter((a) => a !== amenity));
    } else {
      onChange([...selected, amenity]);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Tap to select amenities included with this listing.
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((amenity) => {
          const isSelected = selected.includes(amenity);
          return (
            <button
              key={amenity}
              type="button"
              disabled={disabled}
              onClick={() => toggle(amenity)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:border-primary/50 hover:bg-muted",
                disabled && "cursor-not-allowed opacity-60"
              )}
            >
              {amenity}
            </button>
          );
        })}
      </div>
    </div>
  );
}
