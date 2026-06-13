import Link from "next/link";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function RentVestLogo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 font-semibold", className)}>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
        <Building2 className="h-5 w-5" />
      </div>
      <span className="text-xl tracking-tight">
        Pay<span className="text-emerald-600">Forme</span>
      </span>
    </Link>
  );
}
