"use client";

import { useLayoutEffect } from "react";

export function MarketingThemeGuard() {
  useLayoutEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  return null;
}
