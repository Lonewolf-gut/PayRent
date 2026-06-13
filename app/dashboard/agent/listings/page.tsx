"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";

type ListingSummary = { id: string; name: string; count: number };

export default function AgentListingsPage() {
  const { data: applications, isLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const res = await fetch("/api/applications");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const listings: ListingSummary[] = [];

  for (const app of applications ?? []) {
    const property = app.property as { id?: string; name?: string } | undefined;
    if (!property?.id || !property.name) continue;

    const existing = listings.find((item) => item.id === property.id);
    if (existing) {
      existing.count += 1;
    } else {
      listings.push({ id: property.id, name: property.name, count: 1 });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Assigned listings</h1>
        <p className="text-muted-foreground">Properties you manage on behalf of landlords.</p>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : listings.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No assigned listings yet.</CardContent></Card>
      ) : (
        listings.map((listing) => (
          <Card key={listing.id}>
            <CardContent className="flex items-center justify-between pt-6">
              <p className="font-medium">{listing.name}</p>
              <p className="text-sm text-muted-foreground">{listing.count} application(s)</p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
