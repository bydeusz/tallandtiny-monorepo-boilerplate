import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@repo/queries", () => ({
  useAuthResetPassword: () => ({ mutateAsync: vi.fn() }),
  extractErrorMessage: () => "",
}));

import { PasswordForm } from "../password-form";

describe("PasswordForm", () => {
  it("renders the reset button", () => {
    render(<PasswordForm email="john@doe.com" />);
    expect(screen.getByRole("button", { name: "resetButton" })).toBeTruthy();
  });
});
