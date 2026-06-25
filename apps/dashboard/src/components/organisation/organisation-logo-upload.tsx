"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import {
  getOrganisationGetQueryKey,
  getOrganisationListQueryKey,
  useFileReplace,
} from "@repo/queries";
import type { OrganisationListParams } from "@repo/queries";
import { useToast } from "@repo/ui/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/ui/card";

const LIST_PARAMS = { page: 1, limit: 100 } as unknown as OrganisationListParams;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
] as const;

type OrganisationLogoUploadProps = {
  organisationId: string;
  name: string;
  logoUrl: string | null;
  canEdit: boolean;
};

export function OrganisationLogoUpload({
  organisationId,
  name,
  logoUrl,
  canEdit,
}: OrganisationLogoUploadProps) {
  const t = useTranslations("forms.organisation-settings");
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(logoUrl);

  useEffect(() => {
    setPreview(logoUrl);
  }, [logoUrl]);

  const { mutateAsync: replaceFile } = useFileReplace();

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canEdit) {
      return;
    }

    if (!(ALLOWED_TYPES as readonly string[]).includes(file.type)) {
      toast({
        variant: "destructive",
        title: t("errorTitle"),
        description: t("logoInvalidType"),
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: t("errorTitle"),
        description: t("logoTooLarge"),
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await replaceFile({
        scope: "organisation",
        ownerId: organisationId,
        folder: "logo",
        data: { file },
      });

      setPreview(response.downloadUrl);

      await queryClient.invalidateQueries({
        queryKey: getOrganisationGetQueryKey(organisationId),
      });
      await queryClient.invalidateQueries({
        queryKey: getOrganisationListQueryKey(LIST_PARAMS),
      });

      router.refresh();

      toast({
        title: t("successTitle"),
        description: t("successMessage"),
      });
    } catch {
      toast({
        variant: "destructive",
        title: t("errorTitle"),
        description: t("errorMessage"),
      });
    } finally {
      setIsLoading(false);
      e.target.value = "";
    }
  };

  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("logoTitle")}</CardTitle>
        <CardDescription>{t("logoDescription")}</CardDescription>
        {!canEdit ? (
          <p className="text-xs text-muted-foreground pt-1">
            {t("adminOnlyHint")}
          </p>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-4">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-border">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- signed URLs from storage
              <img
                src={preview}
                alt=""
                width={96}
                height={96}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted text-3xl font-semibold text-muted-foreground">
                {initial}
              </div>
            )}
          </div>
          {canEdit ? (
            <div className="space-y-2">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                onChange={handleLogoChange}
                className="hidden"
                id="organisation-logo-upload"
                disabled={isLoading}
              />
              <label
                htmlFor="organisation-logo-upload"
                className={`inline-flex items-center rounded-md bg-muted px-4 py-2 text-sm text-foreground hover:bg-accent ${
                  isLoading ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("logoButton")}
                  </>
                ) : (
                  t("logoButton")
                )}
              </label>
              <p className="text-xs text-muted-foreground">{t("logoHelp")}</p>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
