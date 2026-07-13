"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { useAuthRegister, extractErrorMessage } from "@repo/queries";
import { Button } from "@repo/ui/atoms";
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@repo/ui/molecules";

import { TextField } from "./text-field";
import { PasswordField } from "./password-field";

export function RegisterForm() {
  const router = useRouter();
  const t = useTranslations("auth.register.form");

  const [firstname, setFirstname] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { mutateAsync: register } = useAuthRegister();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    if (password.length < 8) {
      setError(t("errors.passwordLength"));
      setIsSubmitting(false);
      return;
    }

    try {
      await register({
        data: {
          email,
          name: firstname,
          surname,
          password,
        },
      });

      if (typeof window !== "undefined") {
        sessionStorage.setItem("registerEmail", email);
      }

      router.push("/register/confirm");
    } catch (err: unknown) {
      setError(extractErrorMessage(err) ?? t("errors.default"));
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
          label={t("firstname")}
          type="text"
          name="firstname"
          id="firstname"
          placeholder={t("firstnamePlaceholder")}
          value={firstname}
          onChange={(e) => setFirstname(e.target.value)}
        />

        <TextField
          label={t("surname")}
          type="text"
          name="surname"
          id="surname"
          placeholder={t("surnamePlaceholder")}
          value={surname}
          onChange={(e) => setSurname(e.target.value)}
        />

        <TextField
          label={t("email")}
          type="email"
          name="email"
          id="email"
          placeholder={t("emailPlaceholder")}
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

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          {t("signUp")}
        </Button>

        <div className="flex items-center gap-1 text-xs">
          <span className="text-muted-foreground">{t("alreadyHaveAccount")}</span>
          <Link
            href="/login"
            className="text-foreground font-medium underline-offset-4 hover:underline"
          >
            {t("signIn")}
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
