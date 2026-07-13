"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { useAuthActivate, extractErrorMessage } from "@repo/queries";
import { Button } from "@repo/ui/atoms";
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@repo/ui/molecules";

import { TextField } from "./text-field";
import { OtpField } from "./otp-field";

type VerifyEmailFormProps = {
  email: string;
  loginHref?: string;
};

export function VerifyEmailForm({ email, loginHref = "/login" }: VerifyEmailFormProps) {
  const t = useTranslations("auth.verify");

  const [code, setCode] = useState("");
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { mutateAsync: activate } = useAuthActivate();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email) {
      setError(t("missingEmail"));
      return;
    }

    if (code.length !== 6) {
      setError(t("codeRequired"));
      return;
    }

    setIsSubmitting(true);
    try {
      await activate({ data: { email, code } });
      setIsSuccess(true);
    } catch (err: unknown) {
      setError(extractErrorMessage(err) ?? t("error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSuccess) {
    return (
      <div className="w-full max-w-sm space-y-6">
        <Alert variant="default">
          <AlertDescription>{t("success")}</AlertDescription>
        </Alert>
        <Link
          href={loginHref}
          className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
        >
          {t("backToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label={t("emailLabel")}
          type="email"
          name="email"
          id="email"
          placeholder={t("emailPlaceholder")}
          disabled
          value={email}
          onChange={() => undefined}
        />

        <div className="grid gap-1.5">
          <label
            htmlFor="otp-0"
            className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {t("codeLabel")}
          </label>
          <OtpField
            length={6}
            value={code}
            onChange={setCode}
            disabled={isSubmitting}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          {t("submit")}
        </Button>

        <div className="flex items-center gap-1 text-xs">
          <Link
            href={loginHref}
            className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
          >
            {t("backToLogin")}
          </Link>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>{t("error")}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </form>
    </div>
  );
}
