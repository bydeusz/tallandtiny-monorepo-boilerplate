"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useAuth } from "@repo/auth";
import {
  useFileReplace,
  getAuthGetCurrentUserQueryKey,
  extractErrorMessage,
} from "@repo/queries";
import { useToast } from "@repo/ui/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/molecules";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@repo/ui/atoms";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_DIMENSION = 800;

export function UpdateAvatar() {
  const t = useTranslations("forms.user-avatar");
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user?.avatarUrl ?? null,
  );

  const { mutateAsync: replaceFile } = useFileReplace();

  useEffect(() => {
    setAvatarPreview(user?.avatarUrl ?? null);
  }, [user?.avatarUrl]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!(ALLOWED_TYPES as readonly string[]).includes(file.type)) {
      toast({
        variant: "destructive",
        title: t("errorTitle"),
        description: t("invalidType"),
      });
      e.target.value = "";
      return;
    }

    // Validate file size
    if (file.size > MAX_SIZE_BYTES) {
      toast({
        variant: "destructive",
        title: t("errorTitle"),
        description: t("tooLarge"),
      });
      e.target.value = "";
      return;
    }

    // Validate image dimensions
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);

      if (img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
        toast({
          variant: "destructive",
          title: t("errorTitle"),
          description: t("tooLargeDimensions"),
        });
        e.target.value = "";
        return;
      }

      if (!user?.id) {
        toast({
          variant: "destructive",
          title: t("errorTitle"),
          description: t("sessionError"),
        });
        return;
      }

      try {
        setIsLoading(true);

        const response = await replaceFile({
          scope: "user",
          ownerId: user.id,
          folder: "avatar",
          data: { file },
        });

        setAvatarPreview(response.downloadUrl);

        await queryClient.invalidateQueries({
          queryKey: getAuthGetCurrentUserQueryKey(),
        });

        router.refresh();

        toast({
          title: t("successTitle"),
          description: t("success"),
        });
      } catch (err: unknown) {
        toast({
          variant: "destructive",
          title: t("errorTitle"),
          description:
            extractErrorMessage(err) ?? "Failed to update avatar. Please try again.",
        });
      } finally {
        setIsLoading(false);
        e.target.value = "";
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      toast({
        variant: "destructive",
        title: t("errorTitle"),
        description: t("readError"),
      });
      e.target.value = "";
    };

    img.src = objectUrl;
  };

  const isDisabled = isLoading || !user?.id;
  const fallbackInitial = user?.name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("desc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-4">
          <Avatar className="size-24 rounded-md">
            <AvatarImage
              src={avatarPreview ?? undefined}
              alt={user?.name ?? ""}
              className="rounded-md object-cover"
            />
            <AvatarFallback className="rounded-md bg-muted text-3xl font-semibold text-muted-foreground">
              {fallbackInitial}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarChange}
              className="hidden"
              id="avatar-upload"
              disabled={isDisabled}
            />
            <label
              htmlFor="avatar-upload"
              className={`inline-flex items-center rounded-md bg-muted px-4 py-2 text-sm text-foreground hover:bg-accent ${
                isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("button")}
                </>
              ) : (
                t("button")
              )}
            </label>
            <p className="text-xs text-muted-foreground">{t("hint")}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
