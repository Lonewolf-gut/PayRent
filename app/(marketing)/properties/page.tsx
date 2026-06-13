"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { MapPin, Bed } from "lucide-react";

export default function PropertiesPage() {
  const [search, setSearch] = useState("");
  const [propertyType, setPropertyType] = useState("ALL");

  const { data, isLoading } = useQuery({
    queryKey: ["properties", search, propertyType],
    queryFn: async () => {
      const params = new URLSearchParams({
        search,
        page: "1",
        limit: "12",
        ...(propertyType !== "ALL" ? { propertyType } : {}),
      });
      const res = await fetch(`/api/properties?${params}`);
      const json = await res.json();
      return json.data;
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Browse Properties</h1>
        <p className="mt-2 text-muted-foreground">
          Find your next home and apply for rental financing
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
          <Input
            placeholder="Search by location, name or property type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-full"
          />
          <Select value={propertyType} onValueChange={(value) => setPropertyType(value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All property types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              <SelectItem value="APARTMENT">Apartment</SelectItem>
              <SelectItem value="HOUSE">House</SelectItem>
              <SelectItem value="CONDO">Condo</SelectItem>
              <SelectItem value="STUDIO">Studio</SelectItem>
              <SelectItem value="COMMERCIAL">Commercial</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Loading properties...</p>
      ) : !data?.items?.length ? (
        <p className="text-muted-foreground">No properties found. Check back soon!</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((property: {
            id: string;
            name: string;
            location: string;
            monthlyRent: number;
            propertyType: string;
            isPremium: boolean;
            images?: { url: string }[];
          }) => (
            <Card key={property.id} className="overflow-hidden">
              <div className="aspect-video bg-muted">
                {property.images?.[0]?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={property.images[0].url}
                    alt={property.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <Bed className="h-12 w-12" />
                  </div>
                )}
              </div>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{property.name}</CardTitle>
                  {property.isPremium && (
                    <Badge className="bg-amber-500">Premium</Badge>
                  )}
                </div>
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {property.location}
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-emerald-600">
                  GHS {Number(property.monthlyRent).toLocaleString()}
                  <span className="text-sm font-normal text-muted-foreground">/mo</span>
                </p>
                <Badge variant="secondary" className="mt-2">
                  {property.propertyType}
                </Badge>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700">
                  <Link href={`/properties/${property.id}`}>View details</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
