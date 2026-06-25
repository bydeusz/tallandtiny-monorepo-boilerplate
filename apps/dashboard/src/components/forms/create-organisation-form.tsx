"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { useOrganisation } from "@repo/auth";
import {
  getOrganisationListQueryKey,
  useOrganisationCreate,
} from "@repo/queries";
import type { CreateOrganisationDto, OrganisationListParams } from "@repo/queries";
import { Button } from "@repo/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/ui/card";
import { useToast } from "@repo/ui/hooks/use-toast";

import { TextField } from "@/components/forms/text-field";

const LIST_PARAMS = {
  page: 1,
  limit: 100,
} as unknown as OrganisationListParams;

export function CreateOrganisationForm() {
  const t = useTranslations("forms.createOrganisation");
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setSelectedOrganisationId } = useOrganisation();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [kvk, setKvk] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [iban, setIban] = useState("");

  const { mutateAsync, isPending } = useOrganisationCreate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: CreateOrganisationDto = {
      name: name.trim(),
      address: address.trim(),
      postalCode: postalCode.trim(),
      city: city.trim(),
      ...(kvk.trim() ? { kvk: kvk.trim() } : {}),
      ...(vatNumber.trim() ? { vatNumber: vatNumber.trim() } : {}),
      ...(iban.trim() ? { iban: iban.trim() } : {}),
    };

    try {
      const created = await mutateAsync({ data });
      await queryClient.invalidateQueries({
        queryKey: getOrganisationListQueryKey(LIST_PARAMS),
      });
      setSelectedOrganisationId(created.id);
      toast({
        title: t("successTitle"),
        description: t("success"),
      });
      router.push("/organisation");
      router.refresh();
    } catch {
      toast({
        variant: "destructive",
        title: t("errorTitle"),
        description: t("error"),
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextField
            id="org-name"
            name="name"
            type="text"
            placeholder={t("namePlaceholder")}
            label={t("name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <TextField
            id="org-address"
            name="address"
            type="text"
            placeholder={t("addressPlaceholder")}
            label={t("address")}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <TextField
              id="org-postal"
              name="postalCode"
              type="text"
              placeholder={t("postalCodePlaceholder")}
              label={t("postalCode")}
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              required
            />
            <TextField
              id="org-city"
              name="city"
              type="text"
              placeholder={t("cityPlaceholder")}
              label={t("city")}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
          </div>
          <TextField
            id="org-kvk"
            name="kvk"
            type="text"
            placeholder={t("kvkPlaceholder")}
            label={t("kvk")}
            value={kvk}
            onChange={(e) => setKvk(e.target.value)}
          />
          <TextField
            id="org-vat"
            name="vatNumber"
            type="text"
            placeholder={t("vatNumberPlaceholder")}
            label={t("vatNumber")}
            value={vatNumber}
            onChange={(e) => setVatNumber(e.target.value)}
          />
          <TextField
            id="org-iban"
            name="iban"
            type="text"
            placeholder={t("ibanPlaceholder")}
            label={t("iban")}
            value={iban}
            onChange={(e) => setIban(e.target.value)}
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {t("submitting")}
                </>
              ) : (
                t("submit")
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/organisation")}
              disabled={isPending}
            >
              {t("cancel")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
