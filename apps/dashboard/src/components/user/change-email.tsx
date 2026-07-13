"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@repo/auth";
import { useAuthRequestEmailChange, extractErrorMessage } from "@repo/queries";
import { useToast } from "@repo/ui/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/molecules";
import { Button } from "@repo/ui/atoms";
import { TextField } from "@repo/auth/components";

export function ChangeEmail() {
  const t = useTranslations("forms.user-email");
  const { user } = useAuth();
  const { toast } = useToast();
  const { mutateAsync: requestEmailChange } = useAuthRequestEmailChange();

  const [newEmail, setNewEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newEmail.trim()) return;

    setIsLoading(true);
    try {
      await requestEmailChange({ data: { newEmail: newEmail.trim() } });
      toast({
        title: t("successTitle"),
        description: t("successDescription"),
      });
      setNewEmail("");
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: t("errorTitle"),
        description: extractErrorMessage(err) ?? t("errorTitle"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="mb-6 space-y-4">
            <TextField
              label={t("currentLabel")}
              type="email"
              name="currentEmail"
              id="currentEmail"
              placeholder=""
              value={user?.email ?? ""}
              onChange={() => {}}
              disabled
            />
            <TextField
              label={t("newEmail")}
              required
              type="email"
              name="newEmail"
              id="newEmail"
              placeholder={t("newEmailPlaceholder")}
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            variant="default"
            disabled={isLoading || !newEmail.trim()}
          >
            {t("submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
