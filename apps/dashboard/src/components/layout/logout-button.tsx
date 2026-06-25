"use client";

import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { useAuth } from "@repo/auth";

export function LogoutButton() {
  const { logout } = useAuth();
  const t = useTranslations("common.buttons");

  return (
    <button
      type="button"
      onClick={() => void logout()}
      className="text-foreground hover:bg-accent hover:text-accent-foreground flex w-full cursor-pointer items-center rounded-md px-2.5 py-2 text-xs font-medium transition-colors"
    >
      <LogOut className="mr-1.5 size-4" />
      {t("logout")}
    </button>
  );
}
