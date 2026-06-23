import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { financialSnapshotFixture } from "@/test/fixtures/financial-snapshot";
import { OnboardingSetup } from "./onboarding-setup";

describe("OnboardingSetup", () => {
  it("blocks save when a profile amount is invalid", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <OnboardingSetup snapshot={financialSnapshotFixture} isHydrated={true} onSave={onSave} />
    );

    const income = screen.getByLabelText(/monthly income/i);
    await user.clear(income);
    await user.type(income, "-1");
    await user.click(screen.getByRole("button", { name: /save profile/i }));

    expect(await screen.findByText(/enter a positive amount/i)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("submits normalized profile, expense, debt, and goal setup", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <OnboardingSetup snapshot={financialSnapshotFixture} isHydrated={true} onSave={onSave} />
    );

    await user.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].profile.currency).toBe("PHP");
    expect(onSave.mock.calls[0][0].expenses[0].label).toBe("Fixed monthly expenses");
  });
});
