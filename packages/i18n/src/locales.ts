export const locales = ["en", "nl"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const LOCALE_COOKIE_NAME = "NEXT_LOCALE";

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (locales as readonly string[]).includes(value)
  );
}

/**
 * Resolve the active locale from an optional cookie value and Accept-Language
 * header, falling back to the default locale. Pure — safe to unit test.
 */
export function resolveLocale(
  cookieValue?: string | null,
  acceptLanguage?: string | null,
): Locale {
  if (isLocale(cookieValue)) {
    return cookieValue;
  }

  if (acceptLanguage) {
    const fromHeader = acceptLanguage
      .split(",")
      .map((part) => part.split(";")[0]?.trim().slice(0, 2))
      .find((code) => isLocale(code));
    if (isLocale(fromHeader)) {
      return fromHeader;
    }
  }

  return defaultLocale;
}
