"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@repo/auth";
import {
  useUserUpdate,
  getAuthGetCurrentUserQueryKey,
  extractErrorMessage,
} from "@repo/queries";
import type { UpdateUserDto } from "@repo/queries";
import { useToast } from "@repo/ui/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/molecules";
import {
  Button,
  Label,
} from "@repo/ui/atoms";
import { TextField } from "@/components/forms/text-field";

const COUNTRIES = ["NL", "BE", "DE"] as const;

interface BillingFormData {
  address: string;
  postalCode: string;
  city: string;
  country: string;
  kvk: string;
  vatNumber: string;
}

const EMPTY_FORM: BillingFormData = {
  address: "",
  postalCode: "",
  city: "",
  country: "",
  kvk: "",
  vatNumber: "",
};

export function UpdateUserBillingDetails() {
  const t = useTranslations("forms.user-billing");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { mutateAsync } = useUserUpdate();

  const [formData, setFormData] = useState<BillingFormData>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFormData((prev) => {
      const hasInput = Object.values(prev).some((v) => v.length > 0);
      if (hasInput) return prev;
      return {
        address: user.address ?? "",
        postalCode: user.postalCode ?? "",
        city: user.city ?? "",
        country: user.country ?? "",
        kvk: user.kvk ?? "",
        vatNumber: user.vatNumber ?? "",
      };
    });
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    const payload: UpdateUserDto = {};
    const trimmed = {
      address: formData.address.trim(),
      postalCode: formData.postalCode.trim(),
      city: formData.city.trim(),
      country: formData.country.trim().toUpperCase(),
      kvk: formData.kvk.trim(),
      vatNumber: formData.vatNumber.trim().toUpperCase(),
    };
    if (trimmed.address) payload.address = trimmed.address;
    if (trimmed.postalCode) payload.postalCode = trimmed.postalCode;
    if (trimmed.city) payload.city = trimmed.city;
    if (trimmed.country) payload.country = trimmed.country;
    if (trimmed.kvk) payload.kvk = trimmed.kvk;
    if (trimmed.vatNumber) payload.vatNumber = trimmed.vatNumber;

    setIsSaving(true);
    try {
      await mutateAsync({ id: user.id, data: payload });
      await queryClient.invalidateQueries({
        queryKey: getAuthGetCurrentUserQueryKey(),
      });
      toast({
        title: t("successTitle"),
        description: t("successMessage"),
      });
      router.refresh();
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: t("errorTitle"),
        description: extractErrorMessage(err) ?? t("errorMessage"),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const disabled = isAuthLoading || !user?.id;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField
            label={t("address")}
            type="text"
            name="address"
            id="user-billing-address"
            placeholder={t("addressPlaceholder")}
            value={formData.address}
            onChange={handleChange}
            disabled={disabled}
          />
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label={t("postalCode")}
              type="text"
              name="postalCode"
              id="user-billing-postal"
              placeholder={t("postalCodePlaceholder")}
              value={formData.postalCode}
              onChange={handleChange}
              disabled={disabled}
            />
            <TextField
              label={t("city")}
              type="text"
              name="city"
              id="user-billing-city"
              placeholder={t("cityPlaceholder")}
              value={formData.city}
              onChange={handleChange}
              disabled={disabled}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="user-billing-country">{t("country")}</Label>
            <Select
              value={formData.country}
              onValueChange={(v) =>
                setFormData((prev) => ({ ...prev, country: v }))
              }
              disabled={disabled}
            >
              <SelectTrigger id="user-billing-country">
                <SelectValue placeholder={t("countryPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((code) => (
                  <SelectItem key={code} value={code}>
                    {t(`countries.${code}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <TextField
            label={t("kvk")}
            type="text"
            name="kvk"
            id="user-billing-kvk"
            placeholder={t("kvkPlaceholder")}
            value={formData.kvk}
            onChange={handleChange}
            disabled={disabled}
          />
          <TextField
            label={t("vatNumber")}
            type="text"
            name="vatNumber"
            id="user-billing-vat"
            placeholder={t("vatNumberPlaceholder")}
            value={formData.vatNumber}
            onChange={handleChange}
            disabled={disabled}
          />
          <div className="pt-2">
            <Button type="submit" disabled={disabled || isSaving}>
              {isSaving ? t("saving") : t("save")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
