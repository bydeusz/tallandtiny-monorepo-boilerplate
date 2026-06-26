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
import { useToast } from "@repo/ui/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/molecules";
import { Button } from "@repo/ui/atoms";
import { TextField } from "@/components/forms/text-field";

export function UpdateUser() {
  const t = useTranslations("forms.user-update");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, isLoading } = useAuth();
  const { mutateAsync } = useUserUpdate();

  const [formData, setFormData] = useState({ firstname: "", surname: "" });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFormData((prev) => {
      const hasUserInput = Boolean(prev.firstname || prev.surname);
      if (hasUserInput) return prev;
      return {
        firstname: user.name ?? "",
        surname: user.surname ?? "",
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

    setIsSaving(true);
    try {
      await mutateAsync({
        id: user.id,
        data: { name: formData.firstname, surname: formData.surname },
      });
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

  const disabled = isLoading || !user?.id;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label={t("firstname")}
              type="text"
              name="firstname"
              id="user-firstname"
              placeholder={t("firstnamePlaceholder")}
              value={formData.firstname}
              onChange={handleChange}
              disabled={disabled}
            />
            <TextField
              label={t("surname")}
              type="text"
              name="surname"
              id="user-surname"
              placeholder={t("surnamePlaceholder")}
              value={formData.surname}
              onChange={handleChange}
              disabled={disabled}
            />
          </div>
          <div className="mt-6">
            <Button type="submit" variant="default" disabled={isSaving || disabled}>
              {t("save")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
