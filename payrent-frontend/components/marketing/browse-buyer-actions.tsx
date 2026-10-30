"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MandateNavStatus } from "@/components/mandates/mandate-nav-status";

/** Top-right actions on Browse listings for signed-in buyers. */
export function BrowseBuyerActions() {
  const { data: session } = useSession();
  if (!session?.user || session.user.role !== "BUYER") return null;

  return (
    <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
      <Button
        asChild
        variant="outline"
        size="sm"
        className="justify-center border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-50"
      >
        <Link href="/dashboard/buyer/applications">
          <FileText className="mr-2 h-4 w-4 shrink-0" />
          View finance requests
        </Link>
      </Button>
      <MandateNavStatus hideCount className="w-full justify-center sm:w-auto" />
    </div>
  );
}
