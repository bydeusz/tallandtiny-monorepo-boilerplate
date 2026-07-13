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
  useAuthRequestNewPassword: () => ({ mutateAsync: vi.fn() }),
  extractErrorMessage: () => "",
}));

import { ResetPasswordForm } from "../reset-password-form";

describe("ResetPasswordForm", () => {
  it("renders the submit button", () => {
    render(<ResetPasswordForm />);
    expect(screen.getByRole("button", { name: "submit" })).toBeTruthy();
  });

  it("links back to /login by default and honours loginHref", () => {
    const { rerender } = render(<ResetPasswordForm />);
    expect(screen.getByRole("link", { name: "login" }).getAttribute("href")).toBe("/login");
    rerender(<ResetPasswordForm loginHref="/enter" />);
    expect(screen.getByRole("link", { name: "login" }).getAttribute("href")).toBe("/enter");
  });
});
