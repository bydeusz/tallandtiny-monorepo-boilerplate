import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/layout/header";
import { LinkedCard } from "@/components/cards/linked-card";

export const metadata: Metadata = { title: "Dashboard — Tintsmith" };

export default async function DashboardHomePage() {
  const t = await getTranslations("pages.dashboard");

  return (
    <div className="space-y-6 p-4 md:p-12">
      <Header border title={t("title")} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <LinkedCard
          title={t("organisationCardTitle")}
          description={t("organisationCardDescription")}
          button={t("organisationCardButton")}
          href="/organisation"
          badge={t("organisationCardBadge")}
        />
      </div>
    </div>
  );
}
