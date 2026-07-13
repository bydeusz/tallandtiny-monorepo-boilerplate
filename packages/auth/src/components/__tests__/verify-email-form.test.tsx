import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@repo/queries", () => ({
  useAuthActivate: () => ({ mutateAsync: vi.fn() }),
  extractErrorMessage: () => "",
}));

import { VerifyEmailForm } from "../verify-email-form";

describe("VerifyEmailForm", () => {
  it("renders the submit button and the disabled email field", () => {
    render(<VerifyEmailForm email="john@doe.com" />);
    expect(screen.getByRole("button", { name: "submit" })).toBeTruthy();
    expect(screen.getByDisplayValue("john@doe.com")).toBeTruthy();
  });

  it("links back to login and honours loginHref", () => {
    const { rerender } = render(<VerifyEmailForm email="john@doe.com" />);
    expect(screen.getByRole("link", { name: "backToLogin" }).getAttribute("href")).toBe("/login");
    rerender(<VerifyEmailForm email="john@doe.com" loginHref="/enter" />);
    expect(screen.getByRole("link", { name: "backToLogin" }).getAttribute("href")).toBe("/enter");
  });
});
