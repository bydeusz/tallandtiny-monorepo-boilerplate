"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { useAuthRequestNewPassword, extractErrorMessage } from "@repo/queries";
import { Button } from "@repo/ui/components/ui/button";
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@repo/ui/components/ui/alert";

import { TextField } from "@/components/forms/text-field";

export function ResetPasswordForm() {
  const t = useTranslations("auth.reset");

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { mutateAsync: requestNewPassword } = useAuthRequestNewPassword();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess(false);

    try {
      await requestNewPassword({ data: { email } });
      setSuccess(true);
      setEmail("");
    } catch (err: unknown) {
      setError(extractErrorMessage(err) ?? t("error"));
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
          placeholder="john@doe.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          {t("submit")}
        </Button>

        <div className="flex items-center gap-1 text-xs">
          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
          >
            {t("login")}
          </Link>
        </div>

        {success && (
          <Alert variant="default">
            <AlertDescription>{t("success")}</AlertDescription>
          </Alert>
        )}

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
