import { describe, it, expect } from "vitest";
import en from "./messages/en.json";
import nl from "./messages/nl.json";

function keyPaths(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === "object" && !Array.isArray(value)
      ? keyPaths(value as Record<string, unknown>, path)
      : [path];
  });
}

describe("translation key parity", () => {
  it("en and nl define exactly the same key paths", () => {
    const enKeys = keyPaths(en as Record<string, unknown>).sort();
    const nlKeys = keyPaths(nl as Record<string, unknown>).sort();
    const missingInNl = enKeys.filter((k) => !nlKeys.includes(k));
    const missingInEn = nlKeys.filter((k) => !enKeys.includes(k));
    expect({ missingInNl, missingInEn }).toEqual({
      missingInNl: [],
      missingInEn: [],
    });
  });

  it("ships the expected top-level namespaces", () => {
    expect(Object.keys(en as Record<string, unknown>).sort()).toEqual(
      [
        "auth",
        "banners",
        "common",
        "forms",
        "inputs",
        "modals",
        "navigation",
        "pages",
        "tables",
      ].sort(),
    );
  });
});
