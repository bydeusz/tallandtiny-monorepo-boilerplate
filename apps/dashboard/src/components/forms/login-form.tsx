"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { useAuth } from "@repo/auth";
import { Button } from "@repo/ui/atoms";
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@repo/ui/molecules";

import { TextField } from "@/components/forms/text-field";
import { PasswordField } from "@/components/forms/password-field";

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const t = useTranslations("auth.login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case "MissingCredentials":
        return t("errors.missingCredentials");
      case "UserNotFound":
        return t("errors.userNotFound");
      case "InvalidCredentials":
        return t("errors.invalidPassword");
      case "EmailNotVerified":
        return t("errors.emailNotVerified");
      case "PasswordResetRequired":
        return t("errors.passwordResetRequired");
      default:
        return t("errors.default");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      await login({ email, password });
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "default";
      setError(getErrorMessage(message));
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

        <PasswordField
          label={t("password")}
          name="password"
          id="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex items-center justify-between">
          <Link
            href="/reset-password"
            className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
          >
            {t("forgotPassword")}
          </Link>
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          {t("signIn")}
        </Button>

        <div className="flex items-center gap-1 text-xs">
          <span className="text-muted-foreground">{t("alreadyHaveAccount")}</span>
          <Link
            href="/register"
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            {t("noAccount")}
          </Link>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>{t("errorTitle")}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </form>
    </div>
  );
}
