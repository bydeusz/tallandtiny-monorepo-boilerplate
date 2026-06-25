import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/layout/header";

export const metadata: Metadata = { title: "Dashboard — Tintsmith" };

export default async function DashboardHomePage() {
  const t = await getTranslations("pages.dashboard");

  return (
    <div className="space-y-6 p-4 md:p-12">
      <Header border title={t("title")} />
    </div>
  );
}
