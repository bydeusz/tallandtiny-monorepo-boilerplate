import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("../../auth-provider", () => ({
  useAuth: () => ({ login: vi.fn() }),
}));

import { LoginForm } from "../login-form";

describe("LoginForm", () => {
  it("renders the email field and the sign-in button", () => {
    render(<LoginForm />);
    expect(screen.getByPlaceholderText("john@doe.com")).toBeTruthy();
    expect(screen.getByRole("button", { name: "signIn" })).toBeTruthy();
  });

  it("shows the register link pointing at /register by default", () => {
    render(<LoginForm />);
    expect(
      screen.getByRole("link", { name: "noAccount" }).getAttribute("href"),
    ).toBe("/register");
  });

  it("hides the register link when showRegister is false", () => {
    render(<LoginForm showRegister={false} />);
    expect(screen.queryByRole("link", { name: "noAccount" })).toBeNull();
  });

  it("uses registerHref for the register link target", () => {
    render(<LoginForm registerHref="/sign-up" />);
    expect(
      screen.getByRole("link", { name: "noAccount" }).getAttribute("href"),
    ).toBe("/sign-up");
  });

  it("uses resetHref for the forgot-password link target", () => {
    render(<LoginForm resetHref="/forgot" />);
    expect(
      screen.getByRole("link", { name: "forgotPassword" }).getAttribute("href"),
    ).toBe("/forgot");
  });
});
