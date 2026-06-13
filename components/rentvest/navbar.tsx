"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { RentVestLogo } from "./logo";
import { Button } from "@/components/ui/button";
import { DASHBOARD_ROUTES } from "@/lib/auth/permissions";

export function Navbar() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 border-b border-emerald-100 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <RentVestLogo />
        <nav className="hidden items-center gap-8 md:flex">
          <Link href="/properties" className="text-sm text-emerald-700 hover:text-emerald-900">
            Properties
          </Link>
          <Link href="/#how-it-works" className="text-sm text-emerald-700 hover:text-emerald-900">
            How it works
          </Link>
          <Link href="/#pricing" className="text-sm text-emerald-700 hover:text-emerald-900">
            Pricing
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          {session?.user ? (
            <>
              <Button variant="outline" asChild>
                <Link href={DASHBOARD_ROUTES[session.user.role]}>
                  Dashboard
                </Link>
              </Button>
              <Button variant="ghost" onClick={() => signOut({ callbackUrl: "/" })}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
                <Link href="/register">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
