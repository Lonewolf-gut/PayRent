"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

export default function TenantSavedPropertiesPage() {
  const { data: saved, isLoading } = useQuery({
    queryKey: ["saved-properties"],
    queryFn: async () => {
      const res = await fetch("/api/properties/saved");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Saved Properties</h1>
        <Button asChild variant="outline">
          <Link href="/properties">Browse more</Link>
        </Button>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !saved?.length ? (
        <p className="text-muted-foreground">No saved properties yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {saved.map((item: {
            property: {
              id: string;
              name: string;
              location: string;
              monthlyRent: number;
              images?: { url: string }[];
            };
          }) => (
            <Card key={item.property.id}>
              <div className="aspect-video bg-muted">
                {item.property.images?.[0]?.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.property.images[0].url}
                    alt={item.property.name}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{item.property.name}</CardTitle>
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {item.property.location}
                </p>
              </CardHeader>
              <CardContent>
                <p className="font-bold text-emerald-600">
                  GHS {Number(item.property.monthlyRent).toLocaleString()}/mo
                </p>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700">
                  <Link href={`/properties/${item.property.id}`}>View</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
