"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useDashboardTheme } from "@/components/dashboard/dashboard-theme-provider";

export function ThemeToggle() {
  const dashboardTheme = useDashboardTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted || !dashboardTheme) {
    return (
      <Button variant="outline" size="icon-sm" className="shrink-0" aria-hidden disabled />
    );
  }

  const isDark = dashboardTheme.theme === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      className="shrink-0"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => dashboardTheme.toggleTheme()}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
