import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";

// next/navigation's useRouter throws "invariant expected app router to be
// mounted" in jsdom (no AppRouterContext), so stub it - matching the project's
// existing wizard tests (see purchase-checker-wizard.test.tsx).
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/features/financial-profile/api/save-financial-profile", () => ({
  saveFinancialProfileAction: vi.fn(async () => ({ ok: true, data: null })),
}));

import OnboardingWizard from "./onboarding-wizard";

it("starts on welcome and advances to the intent screen", async () => {
  render(<OnboardingWizard />);
  expect(
    screen.getByRole("heading", { name: /before you buy, ask spendguard/i })
  ).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: /set up my guardrail/i }));
  expect(
    screen.getByRole("heading", { name: /what do you want spendguard to help/i })
  ).toBeInTheDocument();
});

it("goes back one onboarding step", async () => {
  render(<OnboardingWizard />);
  await userEvent.click(screen.getByRole("button", { name: /set up my guardrail/i }));

  await userEvent.click(screen.getByRole("button", { name: /go back/i }));

  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
});

it("shows go back on interstitial onboarding steps", async () => {
  render(<OnboardingWizard />);
  await userEvent.click(screen.getByRole("button", { name: /set up my guardrail/i }));
  await userEvent.click(screen.getByRole("button", { name: /continue/i }));
  await userEvent.click(screen.getByRole("button", { name: /continue/i }));

  await userEvent.click(screen.getByRole("button", { name: /go back/i }));

  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "3");
});
