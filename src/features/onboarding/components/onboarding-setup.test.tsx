import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { financialSnapshotFixture } from "@/test/fixtures/financial-snapshot";
import { OnboardingSetup } from "./onboarding-setup";

async function goToStep(user: ReturnType<typeof userEvent.setup>, stepName: string) {
  while (!screen.queryByRole("heading", { name: stepName })) {
    await user.click(screen.getByRole("button", { name: "Continue" }));
  }
}

describe("OnboardingSetup", () => {
  it("renders desktop and mobile six-step labels and only shows Finish Setup on Step 6", async () => {
    const user = userEvent.setup();

    render(
      <OnboardingSetup snapshot={financialSnapshotFixture} isHydrated={true} onSave={vi.fn()} />
    );

    for (const label of ["Income", "Savings", "Expenses", "Debt", "Goals", "Review"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(2);
    }

    expect(screen.queryByRole("button", { name: "Finish Setup" })).not.toBeInTheDocument();

    await goToStep(user, "Review your setup");

    expect(screen.getByRole("button", { name: "Finish Setup" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Continue" })).not.toBeInTheDocument();
  });

  it("blocks Step 1 when income is invalid and preserves values after Back", async () => {
    const user = userEvent.setup();

    render(
      <OnboardingSetup snapshot={financialSnapshotFixture} isHydrated={true} onSave={vi.fn()} />
    );

    await user.clear(screen.getByLabelText("Full name"));
    await user.type(screen.getByLabelText("Full name"), "Askia");
    // Radix Select: click trigger to open, then click the option
    await user.click(screen.getByLabelText("Pay frequency"));
    await user.click(await screen.findByRole("option", { name: "Every 2 weeks" }));
    await user.clear(screen.getByLabelText("Estimated variable expenses"));
    await user.type(screen.getByLabelText("Estimated variable expenses"), "12000");

    const income = screen.getByLabelText("Monthly income");
    await user.clear(income);
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText(/enter a positive amount/i)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Income" })).toBeVisible();

    await user.clear(income);
    await user.type(income, "90000");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByLabelText("Monthly income")).toHaveValue(90000);
    expect(screen.getByLabelText("Full name")).toHaveValue("Askia");
    expect(screen.getByLabelText("Pay frequency")).toHaveTextContent("Every 2 weeks");
    expect(screen.getByLabelText("Estimated variable expenses")).toHaveValue(12000);
  });

  it("shows savings helpers, expense category sum, debt fields, and four goal options", async () => {
    const user = userEvent.setup();

    render(
      <OnboardingSetup snapshot={financialSnapshotFixture} isHydrated={true} onSave={vi.fn()} />
    );

    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("heading", { name: "Savings" })).toBeVisible();
    expect(screen.getByText(/recommended emergency target/i)).toBeVisible();
    expect(screen.getByLabelText("Optional savings breakdown")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("heading", { name: "Expenses" })).toBeVisible();
    expect(screen.getByLabelText("Housing")).toBeVisible();
    expect(screen.getByLabelText("Utilities and internet")).toBeVisible();
    expect(screen.getByLabelText("Food and transport")).toBeVisible();
    expect(screen.getByText(/expense category sum/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("heading", { name: "Debt" })).toBeVisible();
    expect(screen.getByLabelText("Debt name")).toBeVisible();
    expect(screen.getByLabelText("Outstanding balance")).toBeVisible();
    expect(screen.getByLabelText("Minimum monthly payment")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("heading", { name: "Goals" })).toBeVisible();

    const goalOptions = screen.getByRole("group", { name: "Goal options" });
    expect(within(goalOptions).getAllByRole("checkbox")).toHaveLength(4);
    for (const label of [
      "Emergency buffer",
      "Phone upgrade fund",
      "Travel fund",
      "Debt payoff buffer",
    ]) {
      expect(within(goalOptions).getByLabelText(label)).toBeVisible();
    }
  });

  it("submits a normalized profile, expense, debt, and selected goals payload on Step 6", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <OnboardingSetup snapshot={financialSnapshotFixture} isHydrated={true} onSave={onSave} />
    );

    await user.clear(screen.getByLabelText("Full name"));
    await user.type(screen.getByLabelText("Full name"), "Askia Manjares");
    // Radix Select: click trigger to open, then click the option
    await user.click(screen.getByLabelText("Pay frequency"));
    await user.click(await screen.findByRole("option", { name: "Weekly" }));
    await user.clear(screen.getByLabelText("Estimated variable expenses"));
    await user.type(screen.getByLabelText("Estimated variable expenses"), "15000");
    await user.clear(screen.getByLabelText("Monthly income"));
    await user.type(screen.getByLabelText("Monthly income"), "90000");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await user.clear(screen.getByLabelText("Current savings"));
    await user.type(screen.getByLabelText("Current savings"), "130000");
    await user.clear(screen.getByLabelText("Emergency fund target"));
    await user.type(screen.getByLabelText("Emergency fund target"), "240000");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await user.clear(screen.getByLabelText("Housing"));
    await user.type(screen.getByLabelText("Housing"), "25000");
    await user.clear(screen.getByLabelText("Utilities and internet"));
    await user.type(screen.getByLabelText("Utilities and internet"), "7000");
    await user.clear(screen.getByLabelText("Food and transport"));
    await user.type(screen.getByLabelText("Food and transport"), "15000");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await user.clear(screen.getByLabelText("Debt name"));
    await user.type(screen.getByLabelText("Debt name"), "Credit card");
    await user.clear(screen.getByLabelText("Outstanding balance"));
    await user.type(screen.getByLabelText("Outstanding balance"), "40000");
    await user.clear(screen.getByLabelText("Minimum monthly payment"));
    await user.type(screen.getByLabelText("Minimum monthly payment"), "6000");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await user.click(screen.getByLabelText("Phone upgrade fund"));
    await user.click(screen.getByLabelText("Travel fund"));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByRole("heading", { name: "Review your setup" })).toBeVisible();
    expect(screen.getByText("Askia Manjares")).toBeVisible();
    expect(screen.getByText("Weekly")).toBeVisible();
    expect(screen.getByText("₱15,000")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Finish Setup" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const payload = onSave.mock.calls[0][0];

    expect(payload.profile).toMatchObject({
      currency: "PHP",
      monthlyIncome: 90000,
      currentSavings: 130000,
      emergencyFundTarget: 240000,
      fullName: "Askia Manjares",
      payFrequency: "weekly",
      estimatedVariableExpenses: 15000,
    });
    expect(payload.expenses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Housing", amount: 25000 }),
        expect.objectContaining({ label: "Utilities and internet", amount: 7000 }),
        expect.objectContaining({ label: "Food and transport", amount: 15000 }),
      ])
    );
    expect(payload.debts).toEqual([
      expect.objectContaining({
        label: "Credit card",
        outstandingBalance: 40000,
        minimumPayment: 6000,
      }),
    ]);
    expect(payload.goals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Emergency buffer", priority: "high" }),
        expect.objectContaining({ label: "Phone upgrade fund", targetAmount: 25000 }),
        expect.objectContaining({ label: "Travel fund", targetAmount: 50000 }),
      ])
    );
  });
});
