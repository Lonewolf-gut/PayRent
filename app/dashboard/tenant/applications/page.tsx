"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { APPLICATION_STATUS_LABELS } from "@/constants/platform";

export default function TenantApplicationsPage() {
  const { data: applications, isLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const res = await fetch("/api/applications");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Property applications</h1>
          <p className="text-muted-foreground">
            Track your rental applications and landlord decisions.
          </p>
        </div>
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
          <Link href="/properties">Browse listings</Link>
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading applications...</p>
      ) : !applications?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No applications yet. Browse properties and apply to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {applications.map((app: {
            id: string;
            status: string;
            requestedMoveInDate?: string;
            property?: { name: string; location: string };
            decisionReason?: string;
          }) => (
            <Card key={app.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base">{app.property?.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{app.property?.location}</p>
                </div>
                <StatusBadge status={app.status} label={APPLICATION_STATUS_LABELS[app.status]} />
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  {app.requestedMoveInDate
                    ? `Move-in: ${new Date(app.requestedMoveInDate).toLocaleDateString()}`
                    : "Move-in date not specified"}
                </p>
                {app.status === "APPROVED" && (
                  <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                    <Link href="/dashboard/tenant/financing">Request Pay for Rent financing</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
