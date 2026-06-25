"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { useAuth, useOrganisation, useOrganisationOwnership } from "@repo/auth";
import { useOrganisationGet } from "@repo/queries";

import { CreateOrganisationForm } from "@/components/forms/create-organisation-form";

import { OrganisationLogoUpload } from "./organisation-logo-upload";

export function UpdateOrganisationBranding() {
  const t = useTranslations("forms.organisation-settings");
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const { selectedOrganisationId, setSelectedOrganisationId } = useOrganisation();
  const { isOwner } = useOrganisationOwnership(selectedOrganisationId);

  // ?org= deep-link: set selected org from URL if valid
  useEffect(() => {
    const orgFromUrl = searchParams.get("org");
    if (!orgFromUrl || !user) return;
    if (!user.organisationIds.includes(orgFromUrl)) return;
    setSelectedOrganisationId(orgFromUrl);
  }, [searchParams, user, setSelectedOrganisationId]);

  const { data: organisation, isLoading, isError } = useOrganisationGet(
    selectedOrganisationId ?? "",
    { query: { enabled: Boolean(selectedOrganisationId) } },
  );

  if (!selectedOrganisationId) {
    return <CreateOrganisationForm />;
  }

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {t("loading")}
      </p>
    );
  }

  if (isError || !organisation) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {t("errorLoad")}
      </p>
    );
  }

  return (
    <OrganisationLogoUpload
      organisationId={organisation.id}
      name={organisation.name}
      logoUrl={organisation.logoUrl}
      canEdit={isOwner}
    />
  );
}
