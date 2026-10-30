"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Top-right actions on Browse listings for signed-in buyers. */
export function BrowseBuyerActions() {
  const { data: session } = useSession();
  if (!session?.user || session.user.role !== "BUYER") return null;

  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      className="w-full justify-center border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-50 sm:w-auto"
    >
      <Link href="/dashboard/buyer/applications">
        <FileText className="mr-2 h-4 w-4 shrink-0" />
        View finance requests
      </Link>
    </Button>
  );
}
