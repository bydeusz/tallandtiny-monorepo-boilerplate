"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@repo/auth";
import { useAuthChangePassword, extractErrorMessage } from "@repo/queries";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/molecules";
import { Button } from "@repo/ui/atoms";
import { PasswordField } from "@repo/auth/components";

export function UpdatePassword() {
  const t = useTranslations("forms.user-password");
  const { logout } = useAuth();
  const { mutateAsync: changePassword } = useAuthChangePassword();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError(t("errors.passwordMismatch"));
      return;
    }

    if (newPassword.length < 8) {
      setError(t("errors.passwordLength"));
      return;
    }

    setIsLoading(true);

    try {
      await changePassword({ data: { currentPassword, newPassword } });
      await logout();
    } catch (err: unknown) {
      setError(extractErrorMessage(err) ?? t("errors.default"));
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="mb-6 space-y-4">
            <PasswordField
              label={t("currentPassword")}
              required
              name="currentPassword"
              id="currentPassword"
              placeholder={t("currentPasswordPlaceholder")}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <PasswordField
              label={t("newPassword")}
              required
              name="newPassword"
              id="newPassword"
              placeholder={t("newPasswordPlaceholder")}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <PasswordField
              label={t("confirmPassword")}
              required
              name="confirmPassword"
              id="confirmPassword"
              placeholder={t("confirmPasswordPlaceholder")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {error && (
              <Alert variant="destructive">
                <AlertTitle>{t("errorTitle")}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
          <Button type="submit" variant="default" disabled={isLoading}>
            {t("update")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
