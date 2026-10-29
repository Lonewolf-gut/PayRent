"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardTheme } from "@/components/dashboard/dashboard-theme-provider";

export function ThemeToggle() {
  const dashboardTheme = useDashboardTheme();

  if (!dashboardTheme) {
    return null;
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
