import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { RegisterConfirmForm } from "../register-confirm-form";

describe("RegisterConfirmForm", () => {
  it("renders the continue button", () => {
    render(<RegisterConfirmForm />);
    expect(screen.getByRole("button", { name: "button" })).toBeTruthy();
  });
});
