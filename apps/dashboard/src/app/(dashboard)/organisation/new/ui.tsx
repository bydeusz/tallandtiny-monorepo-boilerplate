"use client";

import { useTranslations } from "next-intl";

import { useAuth } from "@repo/auth";
import { CreateOrganisationForm } from "@/components/forms/create-organisation-form";

export function CreateOrganisationPageClient() {
  const t = useTranslations("forms.createOrganisation");
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {t("loading")}
      </p>
    );
  }

  return <CreateOrganisationForm />;
}
