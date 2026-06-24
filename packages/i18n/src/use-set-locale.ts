"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import type { Locale } from "./locales";

/**
 * Returns a function that switches the active locale via the `/api/language`
 * route and refreshes the current route so server components re-render with the
 * new messages.
 */
export function useSetLocale(): (locale: Locale) => Promise<void> {
  const router = useRouter();

  return useCallback(
    async (locale: Locale) => {
      const response = await fetch("/api/language", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });

      if (!response.ok) {
        console.error("[useSetLocale] Failed to switch locale");
        return;
      }

      router.refresh();
    },
    [router],
  );
}
