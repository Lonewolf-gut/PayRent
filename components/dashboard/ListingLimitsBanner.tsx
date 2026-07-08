"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PROPERTY_CATEGORIES } from "@/lib/subscription-limits";

type ListingLimits = {
  plan: string;
  unlimited: boolean;
  usage: {
    residential: number;
    car: number;
    appliance: number;
    total: number;
  };
  limits: {
    residential: number;
    cars: number;
    appliances: number;
    total: number;
  };
};

export function ListingLimitsBanner() {
  const { data, isLoading } = useQuery({
    queryKey: ["listing-limits"],
    queryFn: async () => {
      const res = await fetch("/api/properties/listing-limits");
      const json = await res.json();
      return json.data as ListingLimits;
    },
  });

  if (isLoading || !data) return null;

  if (data.unlimited) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <span className="font-medium">Premium plan:</span> unlimited listings across all
        categories.
      </div>
    );
  }

  const rows = [
    {
      key: "residential" as const,
      label: PROPERTY_CATEGORIES.residential.label,
      used: data.usage.residential,
      max: data.limits.residential,
    },
    {
      key: "car" as const,
      label: PROPERTY_CATEGORIES.car.label,
      used: data.usage.car,
      max: data.limits.cars,
    },
    {
      key: "appliance" as const,
      label: PROPERTY_CATEGORIES.appliance.label,
      used: data.usage.appliance,
      max: data.limits.appliances,
    },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-slate-900">Free plan listing limits</p>
          <p className="text-sm text-muted-foreground">
            {data.usage.total} of {data.limits.total} total listings used
          </p>
        </div>
        <Badge variant="secondary">Free plan</Badge>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {rows.map((row) => (
          <div
            key={row.key}
            className="rounded-lg border border-white bg-white px-3 py-2 text-sm"
          >
            <p className="font-medium text-slate-800">{row.label}</p>
            <p className="text-muted-foreground">
              {row.used} / {row.max} max
            </p>
          </div>
        ))}
      </div>
      {data.usage.total >= data.limits.total ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-amber-800">
            You&apos;ve reached your free plan limit. Upgrade to list more.
          </p>
          <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700">
            <Link href="/dashboard/merchant">Upgrade plan</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
