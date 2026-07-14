"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "payforme-dashboard-theme";

type DashboardTheme = "light" | "dark";

type DashboardThemeContextValue = {
  theme: DashboardTheme;
  setTheme: (theme: DashboardTheme) => void;
  toggleTheme: () => void;
};

const DashboardThemeContext = createContext<DashboardThemeContextValue | null>(
  null
);

function applyThemeClass(theme: DashboardTheme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

function readStoredTheme(): DashboardTheme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "dark" ? "dark" : "light";
}

export function DashboardThemeProvider({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [theme, setThemeState] = useState<DashboardTheme>("light");

  useLayoutEffect(() => {
    const stored = readStoredTheme();
    setThemeState(stored);
    applyThemeClass(stored);
  }, []);

  const setTheme = useCallback((next: DashboardTheme) => {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyThemeClass(next);
    void fetch("/api/settings/theme", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: next }),
    }).catch(() => undefined);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next = current === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, next);
      applyThemeClass(next);
      void fetch("/api/settings/theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: next }),
      }).catch(() => undefined);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme]
  );

  return (
    <DashboardThemeContext.Provider value={value}>
      <div
        className={cn(
          className,
          theme === "dark" ? "dark min-h-screen bg-background" : "min-h-screen bg-background"
        )}
      >
        {children}
      </div>
    </DashboardThemeContext.Provider>
  );
}

export function useDashboardTheme() {
  return useContext(DashboardThemeContext);
}
