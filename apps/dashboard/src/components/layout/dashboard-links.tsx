"use client";

import { Home } from "lucide-react";
import { useTranslations } from "next-intl";
import { NavLink } from "@repo/ui/components/ui/nav-link";

export function DashboardLinks() {
  const t = useTranslations("navigation.navbar");

  return (
    <>
      <NavLink
        href="/"
        exact
        className="flex w-full gap-1.5 px-2.5 text-xs text-foreground"
      >
        <Home className="size-4" />
        {t("links.dashboard")}
      </NavLink>
    </>
  );
}
