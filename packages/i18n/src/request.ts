import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

import { LOCALE_COOKIE_NAME, resolveLocale } from "./locales";
import enMessages from "./messages/en.json";
import nlMessages from "./messages/nl.json";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headersList = await headers();

  const locale = resolveLocale(
    cookieStore.get(LOCALE_COOKIE_NAME)?.value,
    headersList.get("accept-language"),
  );

  const messages = locale === "nl" ? nlMessages : enMessages;

  return { locale, messages };
});
