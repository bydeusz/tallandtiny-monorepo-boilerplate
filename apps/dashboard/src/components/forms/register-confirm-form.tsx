"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { Button } from "@repo/ui/atoms";

export function RegisterConfirmForm() {
  const router = useRouter();
  const t = useTranslations("auth.register.confirm");

  const [email] = useState(() =>
    typeof window === "undefined"
      ? ""
      : (sessionStorage.getItem("registerEmail") ?? ""),
  );

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">
          {email
            ? t("description", { email })
            : t("emailFallback")}
        </p>
      </div>

      <Button className="w-full" onClick={() => router.push("/login")}>
        {t("button")}
      </Button>
    </div>
  );
}
