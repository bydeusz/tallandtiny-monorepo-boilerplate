"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { useAuthResetPassword, extractErrorMessage } from "@repo/queries";
import { Button } from "@repo/ui/components/ui/button";
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@repo/ui/components/ui/alert";

import { TextField } from "@/components/forms/text-field";
import { PasswordField } from "@/components/forms/password-field";

interface PasswordFormProps {
  email: string;
}

export function PasswordForm({ email }: PasswordFormProps) {
  const router = useRouter();
  const t = useTranslations("auth.reset");

  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { mutateAsync: resetPassword } = useAuthResetPassword();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim()) {
      setError(t("missingEmail"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("errors.passwordMismatch"));
      return;
    }

    if (newPassword.length < 8) {
      setError(t("errors.passwordLength"));
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword({
        data: {
          email,
          temporaryPassword,
          newPassword,
        },
      });

      router.push("/login?reset=success");
    } catch (err: unknown) {
      const raw = extractErrorMessage(err);
      if (raw === "Temporary password has expired.") {
        setError(t("errors.expired"));
      } else {
        setError(raw ?? t("error"));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label={t("email")}
          type="email"
          name="email"
          id="email"
          placeholder={email}
          disabled
          value={email}
          onChange={() => undefined}
        />

        <PasswordField
          label={t("temporaryPassword")}
          name="temporaryPassword"
          id="temporaryPassword"
          placeholder={t("temporaryPasswordPlaceholder")}
          required
          value={temporaryPassword}
          onChange={(e) => setTemporaryPassword(e.target.value)}
        />

        <PasswordField
          label={t("newPassword")}
          name="newPassword"
          id="newPassword"
          placeholder={t("newPasswordPlaceholder")}
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />

        <PasswordField
          label={t("confirmPassword")}
          name="confirmPassword"
          id="confirmPassword"
          placeholder={t("confirmPasswordPlaceholder")}
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          {t("resetButton")}
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </form>
    </div>
  );
}
