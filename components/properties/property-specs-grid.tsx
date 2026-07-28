"use client";

import type { PropertySpecItem } from "@/lib/utils/property-specs";

export function PropertySpecsGrid({ specs }: { specs: PropertySpecItem[] }) {
  if (!specs.length) return null;

  return (
    <div className="grid gap-4 border bg-muted/10 p-4 sm:grid-cols-2 lg:grid-cols-3">
      {specs.map((spec) => (
        <div key={`${spec.label}-${spec.value}`} className="min-w-0">
          <p className="truncate text-base font-semibold">{spec.value}</p>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {spec.label}
          </p>
        </div>
      ))}
    </div>
  );
}
