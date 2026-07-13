import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@repo/queries", () => ({
  useAuthRegister: () => ({ mutateAsync: vi.fn() }),
  extractErrorMessage: () => "",
}));

import { RegisterForm } from "../register-form";

describe("RegisterForm", () => {
  it("renders the sign-up button", () => {
    render(<RegisterForm />);
    expect(screen.getByRole("button", { name: "signUp" })).toBeTruthy();
  });

  it("links back to /login by default and honours loginHref", () => {
    const { rerender } = render(<RegisterForm />);
    expect(screen.getByRole("link", { name: "signIn" }).getAttribute("href")).toBe("/login");
    rerender(<RegisterForm loginHref="/enter" />);
    expect(screen.getByRole("link", { name: "signIn" }).getAttribute("href")).toBe("/enter");
  });
});
