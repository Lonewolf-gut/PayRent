import Link from "next/link";
import { AuthFooter } from "@/components/rentvest/auth-footer";

type AuthSplitLayoutProps = {
  hero: React.ReactNode;
  children: React.ReactNode;
};

export function AuthSplitLayout({ hero, children }: AuthSplitLayoutProps) {
  return (
    <div className="min-h-screen">
      <div className="fixed inset-y-0 left-0 z-10 hidden w-1/4 lg:block">
        <div className="relative h-full overflow-hidden">{hero}</div>
      </div>
      <div className="flex min-h-screen flex-col bg-white lg:ml-[25%] lg:w-3/4">
        <div className="flex flex-1 flex-col px-4 py-8 sm:px-8 sm:py-10 lg:overflow-y-auto">
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center">
            {children}
          </div>
        </div>
        <AuthFooter className="mt-auto shrink-0" />
      </div>
    </div>
  );
}

export function AuthBackLink({
  href,
  onClick,
  label = "Back",
}: {
  href?: string;
  onClick?: () => void;
  label?: string;
}) {
  const className =
    "inline-flex items-center text-sm font-medium text-slate-600 transition hover:text-slate-900";

  const icon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mr-1.5"
      aria-hidden
    >
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {icon}
        {label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {icon}
      {label}
    </button>
  );
}

export function registerStep2Url(entityType: "INDIVIDUAL" | "COMPANY") {
  const params = new URLSearchParams({ step: "2", entityType });
  return `/register?${params}`;
}
