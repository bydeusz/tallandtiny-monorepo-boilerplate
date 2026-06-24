import { describe, it, expect } from "vitest";
import { resolveLocale, isLocale, defaultLocale } from "./locales";

describe("isLocale", () => {
  it("accepts supported locales", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("nl")).toBe(true);
  });
  it("rejects unsupported values", () => {
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(null)).toBe(false);
    expect(isLocale(42)).toBe(false);
  });
});

describe("resolveLocale", () => {
  it("prefers a valid cookie value", () => {
    expect(resolveLocale("nl", "en-US,en;q=0.9")).toBe("nl");
  });
  it("ignores an invalid cookie and uses Accept-Language", () => {
    expect(resolveLocale("fr", "nl-NL,nl;q=0.9,en;q=0.8")).toBe("nl");
  });
  it("falls back to the default when nothing matches", () => {
    expect(resolveLocale(null, "fr-FR,fr;q=0.9")).toBe(defaultLocale);
  });
  it("falls back to the default with no inputs", () => {
    expect(resolveLocale()).toBe("en");
  });
});
