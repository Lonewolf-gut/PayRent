"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetchMandatePreviews } from "@/lib/mandates/fetch-mandate-previews";
import {
  mandatePreviewShortLabel,
  MANDATE_PREVIEW_STATUS_LABELS,
} from "@/lib/mandates/preview-status-labels";
import { cn } from "@/lib/utils";

export function MandateNavStatus({
  className,
  hideCount = false,
}: {
  className?: string;
  hideCount?: boolean;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const mandatesPath = "/dashboard/buyer/mandates";

  const { data: previews = [], isLoading } = useQuery({
    queryKey: ["mandate-overview"],
    queryFn: fetchMandatePreviews,
    enabled: !!session?.user && role === "BUYER",
    staleTime: 45_000,
    refetchOnWindowFocus: true,
  });

  if (!session?.user || role !== "BUYER") return null;

  const active = pathname === mandatesPath || pathname.startsWith(`${mandatesPath}/`);
  const primary = previews[0];

  if (isLoading) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn("rounded-full text-xs text-muted-foreground", className)}
        disabled
      >
        Mandate…
      </Button>
    );
  }

  if (!previews.length) {
    return (
      <Button
        asChild
        variant={active ? "secondary" : "ghost"}
        size="sm"
        className={cn("rounded-full text-xs", className, active && "bg-emerald-100 text-emerald-900")}
      >
        <Link href={mandatesPath}>Mandates</Link>
      </Button>
    );
  }

  if (previews.length === 1 && primary) {
    return (
      <Button
        asChild
        variant={active ? "secondary" : "ghost"}
        size="sm"
        className={cn(
          "max-w-[11rem] gap-1.5 rounded-full px-2.5",
          className,
          active && "bg-emerald-100 text-emerald-900"
        )}
      >
        <Link href={mandatesPath} title={MANDATE_PREVIEW_STATUS_LABELS[primary.previewStatus]}>
          <FileSignature className="h-4 w-4 shrink-0" />
          <span className="truncate text-xs font-medium">
            {mandatePreviewShortLabel(primary.previewStatus)}
          </span>
        </Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex max-w-[12rem] items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium outline-none ring-emerald-600 focus-visible:ring-2",
          active ? "bg-emerald-100 text-emerald-900" : "hover:bg-muted",
          className
        )}
      >
        <FileSignature className="h-4 w-4 shrink-0" />
        <span className="truncate">
          {primary ? mandatePreviewShortLabel(primary.previewStatus) : "Mandates"}
        </span>
        {!hideCount ? (
          <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] text-white">
            {previews.length}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Pay-for-me mandates</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {previews.map((preview) => {
          const name = preview.propertyName.replace(/^\[Demo\]\s*/i, "");
          return (
            <DropdownMenuItem key={preview.financingRequestId} asChild>
              <Link href={mandatesPath} className="flex flex-col items-start gap-0.5">
                <span className="truncate font-medium">{name}</span>
                <span className="text-xs text-muted-foreground">
                  {MANDATE_PREVIEW_STATUS_LABELS[preview.previewStatus]}
                </span>
              </Link>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={mandatesPath} className="font-medium text-emerald-700">
            Open mandate workspace
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
