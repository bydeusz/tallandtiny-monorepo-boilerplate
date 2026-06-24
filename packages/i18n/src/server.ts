import { NextResponse } from "next/server";

import { LOCALE_COOKIE_NAME, isLocale, locales } from "./locales";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * POST handler that validates and persists the locale cookie. Re-export from an
 * app route: `export { setLocaleHandler as POST } from "@repo/i18n/server";`
 */
export async function setLocaleHandler(
  request: Request,
): Promise<NextResponse> {
  let locale: unknown;
  try {
    const body = (await request.json()) as { locale?: unknown };
    locale = body.locale;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  if (!isLocale(locale)) {
    return NextResponse.json(
      { error: `Invalid locale. Supported locales are: ${locales.join(", ")}.` },
      { status: 400 },
    );
  }

  const response = NextResponse.json({ ok: true, locale }, { status: 200 });
  response.cookies.set({
    name: LOCALE_COOKIE_NAME,
    value: locale,
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONE_YEAR_SECONDS,
  });
  return response;
}
