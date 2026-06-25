import { getTranslations } from "next-intl/server";

import { Header } from "@/components/layout/header";
import { NavLink } from "@repo/ui/components/ui/nav-link";

export default async function OrganisationLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const t = await getTranslations("pages.organisation");

  return (
    <div className="p-4 md:p-12 space-y-6">
      <Header title={t("title")} description={t("description")} />
      <nav className="flex gap-1">
        <NavLink href="/organisation" exact>
          {t("tabs.details")}
        </NavLink>
        <NavLink href="/organisation/branding">
          {t("tabs.branding")}
        </NavLink>
        <NavLink href="/organisation/team">
          {t("tabs.team")}
        </NavLink>
      </nav>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
