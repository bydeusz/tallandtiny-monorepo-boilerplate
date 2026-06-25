"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth, useOrganisation, useOrganisationOwnership } from "@repo/auth";
import {
  getOrganisationGetQueryKey,
  getOrganisationListQueryKey,
  useOrganisationGet,
  useOrganisationUpdate,
} from "@repo/queries";
import type { OrganisationListParams, UpdateOrganisationDto } from "@repo/queries";
import { Button } from "@repo/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/ui/card";
import { useToast } from "@repo/ui/hooks/use-toast";

import { CreateOrganisationForm } from "@/components/forms/create-organisation-form";
import { TextField } from "@/components/forms/text-field";

const LIST_PARAMS = {
  page: 1,
  limit: 100,
} as unknown as OrganisationListParams;

export function UpdateOrganisation() {
  const t = useTranslations("forms.organisation-settings");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { user } = useAuth();
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

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [kvk, setKvk] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [iban, setIban] = useState("");

  // Seed form state when org data loads
  useEffect(() => {
    if (!organisation) return;
    setName(organisation.name ?? "");
    setAddress(organisation.address ?? "");
    setPostalCode(organisation.postalCode ?? "");
    setCity(organisation.city ?? "");
    setKvk(organisation.kvk ?? "");
    setVatNumber(organisation.vatNumber ?? "");
    setIban(organisation.iban ?? "");
  }, [organisation]);

  const { mutateAsync: updateOrganisation } = useOrganisationUpdate();
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organisation?.id) return;

    const payload: UpdateOrganisationDto = {
      name: name.trim(),
      address: address.trim(),
      postalCode: postalCode.trim(),
      city: city.trim(),
      ...(kvk.trim() ? { kvk: kvk.trim() } : {}),
      ...(vatNumber.trim() ? { vatNumber: vatNumber.trim() } : {}),
      ...(iban.trim() ? { iban: iban.trim() } : {}),
    };

    setIsSaving(true);
    try {
      await updateOrganisation({ id: organisation.id, data: payload });
      await queryClient.invalidateQueries({
        queryKey: getOrganisationGetQueryKey(organisation.id),
      });
      await queryClient.invalidateQueries({
        queryKey: getOrganisationListQueryKey(LIST_PARAMS),
      });
      toast({
        title: t("successTitle"),
        description: t("successMessage"),
      });
      router.refresh();
    } catch {
      toast({
        variant: "destructive",
        title: t("errorTitle"),
        description: t("errorMessage"),
      });
    } finally {
      setIsSaving(false);
    }
  };

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

  const disabled = !isOwner;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {disabled && (
          <p className="mb-4 text-xs text-muted-foreground">{t("adminOnlyHint")}</p>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextField
            id="org-settings-name"
            name="name"
            type="text"
            label={t("name")}
            placeholder={t("namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={disabled}
            required
          />
          <TextField
            id="org-settings-address"
            name="address"
            type="text"
            label={t("address")}
            placeholder={t("addressPlaceholder")}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            disabled={disabled}
          />
          <div className="grid grid-cols-2 gap-4">
            <TextField
              id="org-settings-postal"
              name="postalCode"
              type="text"
              label={t("postalCode")}
              placeholder={t("postalCodePlaceholder")}
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              disabled={disabled}
            />
            <TextField
              id="org-settings-city"
              name="city"
              type="text"
              label={t("city")}
              placeholder={t("cityPlaceholder")}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={disabled}
            />
          </div>
          <TextField
            id="org-settings-kvk"
            name="kvk"
            type="text"
            label={t("kvk")}
            placeholder={t("kvkPlaceholder")}
            value={kvk}
            onChange={(e) => setKvk(e.target.value)}
            disabled={disabled}
          />
          <TextField
            id="org-settings-vat"
            name="vatNumber"
            type="text"
            label={t("vatNumber")}
            placeholder={t("vatNumberPlaceholder")}
            value={vatNumber}
            onChange={(e) => setVatNumber(e.target.value)}
            disabled={disabled}
          />
          <TextField
            id="org-settings-iban"
            name="iban"
            type="text"
            label={t("iban")}
            placeholder={t("ibanPlaceholder")}
            value={iban}
            onChange={(e) => setIban(e.target.value)}
            disabled={disabled}
          />
          <div className="pt-2">
            <Button type="submit" disabled={disabled || isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {t("saving")}
                </>
              ) : (
                t("save")
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
