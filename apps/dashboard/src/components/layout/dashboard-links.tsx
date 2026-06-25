"use client";

import { Home, Building2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { NavLink } from "@repo/ui/components/ui/nav-link";

export function DashboardLinks() {
  const t = useTranslations("navigation.navbar");

  return (
    <>
      <NavLink href="/" exact className="w-full">
        <Home className="size-4" />
        {t("links.dashboard")}
      </NavLink>
      <NavLink href="/organisation" className="w-full">
        <Building2 className="size-4" />
        {t("links.organisation")}
      </NavLink>
    </>
  );
}
