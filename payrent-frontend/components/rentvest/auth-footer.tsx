import Link from "next/link";
import { cn } from "@/lib/utils";

export function AuthFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "border-t border-slate-100 bg-white px-4 py-5 text-sm text-slate-500 sm:px-6",
        className
      )}
    >
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p>&copy; {new Date().getFullYear()} PayForMe</p>
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Link href="/terms" className="hover:text-emerald-700 hover:underline">
            Terms &amp; Conditions
          </Link>
          <Link href="/privacy" className="hover:text-emerald-700 hover:underline">
            Privacy Policy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
