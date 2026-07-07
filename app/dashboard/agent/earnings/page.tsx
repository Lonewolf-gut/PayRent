"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Earning = {
  id: string;
  type: "SALE" | "FINANCING";
  amount: string | number;
  grossAmount: string | number;
  reference: string;
  createdAt: string;
  property: { id: string; name: string; propertyType: string };
};

export default function AgentEarningsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["agent-earnings"],
    queryFn: async () => {
      const res = await fetch("/api/agent/earnings");
      const json = await res.json();
      return json.data as {
        earnings: Earning[];
        totalEarned: number;
        totalDeals: number;
      };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Commissions & earnings</h1>
        <p className="text-muted-foreground">
          Commission is your main income as an agent — earned when tenants buy or get financing through your promotion.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total earned</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              GHS {(data?.totalEarned ?? 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Successful deals</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data?.totalDeals ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent commissions</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/agent/wallet">View wallet</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-muted-foreground">Loading earnings...</p>
          ) : !data?.earnings?.length ? (
            <p className="text-muted-foreground">
              No commissions yet. Share your promotion links to start earning.
            </p>
          ) : (
            data.earnings.map((earning) => (
              <div
                key={earning.id}
                className="flex flex-col gap-2 border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{earning.property.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(earning.createdAt).toLocaleString()} · {earning.reference}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={earning.type === "SALE" ? "default" : "secondary"}>
                    {earning.type === "SALE" ? "Sale" : "Financing"}
                  </Badge>
                  <p className="font-semibold text-emerald-600">
                    +GHS {Number(earning.amount).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
