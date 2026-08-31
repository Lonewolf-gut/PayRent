"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  PROPERTY_CATEGORIES,
  PROPERTY_TYPE_LABELS,
  type PropertyCategory,
} from "@/lib/subscription-limits";
import type { PropertyType } from "@prisma/client";

type Props = {
  category: PropertyCategory;
  propertyType: PropertyType;
  onCategoryChange: (category: PropertyCategory) => void;
  onTypeChange: (type: PropertyType) => void;
  disabled?: boolean;
};

export function PropertyCategorySelect({
  category,
  propertyType,
  onCategoryChange,
  onTypeChange,
  disabled,
}: Props) {
  const types = PROPERTY_CATEGORIES[category].types;

  return (
    <>
      <div>
        <Label>Listing category</Label>
        <Select
          value={category}
          onValueChange={(value) => {
            const nextCategory = value as PropertyCategory;
            onCategoryChange(nextCategory);
            onTypeChange(PROPERTY_CATEGORIES[nextCategory].types[0]);
          }}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PROPERTY_CATEGORIES) as PropertyCategory[]).map((key) => (
              <SelectItem key={key} value={key}>
                {PROPERTY_CATEGORIES[key].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-1 text-xs text-muted-foreground">
          {PROPERTY_CATEGORIES[category].description}
        </p>
      </div>
      <div>
        <Label>Type</Label>
        <Select
          value={propertyType}
          onValueChange={(value) => onTypeChange(value as PropertyType)}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {types.map((type) => (
              <SelectItem key={type} value={type}>
                {PROPERTY_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
