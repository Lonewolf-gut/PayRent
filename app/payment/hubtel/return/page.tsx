"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function LegacyHubtelReturnPage() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg items-center px-4 py-16">
      <Card className="w-full rounded-none">
        <CardContent className="space-y-4 pt-8 text-center">
          <h1 className="text-xl font-semibold">Payments use Redde now</h1>
          <p className="text-sm text-muted-foreground">
            Hubtel payment return links are retired. Use Redde for subscriptions, purchases, and
            wallet top-ups.
          </p>
          <Button asChild variant="outline" className="rounded-none">
            <Link href="/">Back home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
