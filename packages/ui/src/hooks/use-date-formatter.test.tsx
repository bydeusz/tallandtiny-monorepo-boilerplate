import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useDateFormatter } from "./use-date-formatter";

describe("useDateFormatter", () => {
  it("formats a local date string as DD-MM-YYYY", () => {
    // No trailing "Z" → parsed in local time, so the day is timezone-stable.
    const { result } = renderHook(() => useDateFormatter("2024-03-09T12:00:00"));
    expect(result.current).toBe("09-03-2024");
  });
});
