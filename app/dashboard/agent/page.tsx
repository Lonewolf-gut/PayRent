"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AgentDashboardPage() {
  const { data: applications } = useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const res = await fetch("/api/applications");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const pending = applications?.filter((a: { status: string }) =>
    ["SUBMITTED", "UNDER_REVIEW"].includes(a.status)
  ).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Agent dashboard</h1>
        <p className="text-muted-foreground">
          Manage assigned listings and support landlord application reviews.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Pending applications</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{pending ?? 0}</p></CardContent>
        </Card>
      </div>
      <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
        <Link href="/dashboard/agent/applications">Review application queue</Link>
      </Button>
    </div>
  );
}
