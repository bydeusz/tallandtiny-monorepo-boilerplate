import { getTranslations } from "next-intl/server";

import { Header } from "@/components/layout/header";
import { NavLink } from "@repo/ui/components/ui/nav-link";

export default async function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const t = await getTranslations("pages.settings");

  return (
    <div className="p-4 md:p-12 space-y-6">
      <Header title={t("title")} description={t("description")} />
      <nav className="flex gap-1">
        <NavLink href="/settings" exact>
          {t("tabs.personal")}
        </NavLink>
        <NavLink href="/settings/account">
          {t("tabs.account")}
        </NavLink>
        <NavLink href="/settings/delete">
          {t("tabs.delete")}
        </NavLink>
      </nav>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
