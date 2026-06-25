import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Sparkles } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/ui/card";

export const metadata: Metadata = {
  title: "Subscription — Tintsmith",
};

export default async function Page() {
  const t = await getTranslations("pages.settings.subscription");

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4 rounded-md border border-dashed border-border bg-muted p-6">
            <Sparkles className="size-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {t("comingSoonTitle")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("comingSoonDescription")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
