import Link from "next/link";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

type RentVestLogoProps = {
  className?: string;
  showIcon?: boolean;
  /** Defaults to home. Pass `null` to render without a link wrapper. */
  href?: string | null;
};

export function RentVestLogo({
  className,
  showIcon = true,
  href = "/",
}: RentVestLogoProps) {
  const content = (
    <>
      {showIcon ? (
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
          <Building2 className="h-5 w-5" />
        </div>
      ) : null}
      <span className="text-xl tracking-tight text-emerald-950">
        Pay<span className="text-emerald-600">ForMe</span>
      </span>
    </>
  );

  if (href == null) {
    return (
      <span className={cn("inline-flex shrink-0 items-center gap-2 font-semibold", className)}>
        {content}
      </span>
    );
  }

  return (
    <Link href={href} className={cn("inline-flex shrink-0 items-center gap-2 font-semibold", className)}>
      {content}
    </Link>
  );
}