import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { financialSnapshotFixture as defaultSnapshot } from "@/test/fixtures/financial-snapshot";
import type { FinancialSnapshot, Goal } from "@/types/finance";
import { GoalsPanel } from "./goals-panel";

const goalsSnapshot: FinancialSnapshot = {
  ...defaultSnapshot,
  goals: [
    { ...defaultSnapshot.goals[0] },
    {
      id: "goal_headphones",
      label: "Noise-cancelling headphones",
      targetAmount: 25000,
      savedAmount: 5000,
      monthlyContribution: 5000,
      targetDate: "2026-10-15",
      priority: "medium",
    },
  ],
};

function renderGoalsPanel({
  snapshot = goalsSnapshot,
  monthlyFreeCashFlow = 20_000,
  onCreateGoal = vi.fn().mockResolvedValue(undefined),
  onDeleteGoal = vi.fn().mockResolvedValue(undefined),
}: {
  snapshot?: FinancialSnapshot;
  monthlyFreeCashFlow?: number;
  onCreateGoal?: (goal: Omit<Goal, "id">) => Promise<Goal | undefined>;
  onDeleteGoal?: (id: string) => Promise<void>;
} = {}) {
  return render(
    <GoalsPanel
      snapshot={snapshot}
      monthlyFreeCashFlow={monthlyFreeCashFlow}
      onCreateGoal={onCreateGoal}
      onDeleteGoal={onDeleteGoal}
    />
  );
}

describe("GoalsPanel", () => {
  it("renders goal summary metrics, detailed cards, and advisor guidance", () => {
    renderGoalsPanel();

    const summary = screen.getByTestId("goals-summary-metrics");
    expect(within(summary).getByText("Active Goals")).toBeVisible();
    expect(within(summary).getByText("2")).toBeVisible();
    expect(within(summary).getByText("Total Target")).toBeVisible();
    expect(within(summary).getByText("₱205,000")).toBeVisible();
    expect(within(summary).getByText("Saved So Far")).toBeVisible();
    expect(within(summary).getByText("₱125,000")).toBeVisible();
    expect(within(summary).getByText("Monthly Funding")).toBeVisible();
    expect(within(summary).getByText("₱15,000")).toBeVisible();

    const newGoalButton = screen.getByRole("button", { name: "New Goal" });
    expect(newGoalButton).toBeEnabled();

    const emergencyGoal = screen.getByRole("article", { name: "Emergency buffer goal" });
    expect(within(emergencyGoal).getByText("Emergency buffer")).toBeVisible();
    expect(within(emergencyGoal).getByText("₱120,000 of ₱180,000")).toBeVisible();
    expect(within(emergencyGoal).getByText("67% saved")).toBeVisible();
    expect(within(emergencyGoal).getByText("₱10,000 monthly contribution")).toBeVisible();
    expect(within(emergencyGoal).getByText("Estimated completion Dec 31, 2026")).toBeVisible();
    expect(within(emergencyGoal).getByText("Safe-buy date Dec 31, 2026")).toBeVisible();
    expect(within(emergencyGoal).getByText("Needed monthly")).toBeVisible();
    expect(within(emergencyGoal).getByText("₱10,000 / payday")).toBeVisible();
    expect(within(emergencyGoal).getByText("Realistic")).toBeVisible();
    expect(within(emergencyGoal).getByText("Most important")).toBeVisible();
    expect(
      within(emergencyGoal).getByRole("progressbar", { name: "Emergency buffer progress" })
    ).toHaveAttribute("aria-valuenow", "67");

    const headphonesGoal = screen.getByRole("article", {
      name: "Noise-cancelling headphones goal",
    });
    expect(within(headphonesGoal).getByText("Noise-cancelling headphones")).toBeVisible();
    expect(within(headphonesGoal).getByText("₱5,000 of ₱25,000")).toBeVisible();
    expect(within(headphonesGoal).getByText("20% saved")).toBeVisible();
    expect(within(headphonesGoal).getByText("₱5,000 monthly contribution")).toBeVisible();
    expect(within(headphonesGoal).getByText("Estimated completion Oct 15, 2026")).toBeVisible();
    expect(within(headphonesGoal).getByText("Safe-buy date Oct 15, 2026")).toBeVisible();
    expect(within(headphonesGoal).getByText("₱5,000 / payday")).toBeVisible();

    expect(screen.getByText("Advisor tip")).toBeVisible();
    expect(
      screen.getByText(/fund the most important goal before flexible wants/i)
    ).toBeVisible();
  });

  it("creates a new goal from the enabled goal form", async () => {
    const user = userEvent.setup();
    const onCreateGoal = vi.fn().mockResolvedValue(undefined);

    renderGoalsPanel({ onCreateGoal });

    await user.click(screen.getByRole("button", { name: "New Goal" }));

    await user.type(screen.getByLabelText("Goal name"), "Camera upgrade");
    await user.type(screen.getByLabelText("Target amount"), "60000");
    await user.type(screen.getByLabelText("Saved so far"), "10000");
    await user.type(screen.getByLabelText("Monthly contribution"), "8000");
    await user.type(screen.getByLabelText("Target date"), "2026-12-15");
    await user.selectOptions(screen.getByLabelText("Priority"), "high");
    await user.click(screen.getByRole("button", { name: "Create Goal" }));

    expect(onCreateGoal).toHaveBeenCalledWith({
      label: "Camera upgrade",
      targetAmount: 60_000,
      savedAmount: 10_000,
      monthlyContribution: 8_000,
      targetDate: "2026-12-15",
      priority: "high",
    });
  });

  it("blocks invalid goal input with accessible errors and allows retry", async () => {
    const user = userEvent.setup();
    const onCreateGoal = vi.fn().mockResolvedValue(undefined);

    renderGoalsPanel({ onCreateGoal });

    await user.click(screen.getByRole("button", { name: "New Goal" }));
    await user.click(screen.getByRole("button", { name: "Create Goal" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Name this goal.");
    expect(alert).toHaveTextContent("Enter a target amount above zero.");
    expect(onCreateGoal).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Goal name"), "Starter fund");
    await user.type(screen.getByLabelText("Target amount"), "12000");
    await user.type(screen.getByLabelText("Monthly contribution"), "3000");
    await user.click(screen.getByRole("button", { name: "Create Goal" }));

    expect(onCreateGoal).toHaveBeenCalledOnce();
  });

  it("shows not-realistic guidance when needed funding exceeds free cash flow", () => {
    renderGoalsPanel({ monthlyFreeCashFlow: 2_000 });

    const emergencyGoal = screen.getByRole("article", { name: "Emergency buffer goal" });
    expect(within(emergencyGoal).getByText("Tight plan")).toBeVisible();
    expect(within(emergencyGoal).getByText(/above current free cash flow/i)).toBeVisible();
  });

  it("uses the profile pay frequency for per-payday guidance", () => {
    renderGoalsPanel({
      snapshot: {
        ...goalsSnapshot,
        profile: {
          ...goalsSnapshot.profile,
          payFrequency: "biweekly",
        },
        goals: [goalsSnapshot.goals[1]],
      },
    });

    const headphonesGoal = screen.getByRole("article", {
      name: "Noise-cancelling headphones goal",
    });

    expect(within(headphonesGoal).getByText("₱2,308 / payday")).toBeVisible();
  });

  it("keeps goal delete controls accessible and calls the delete mutation", async () => {
    const user = userEvent.setup();
    const onDeleteGoal = vi.fn().mockResolvedValue(undefined);

    renderGoalsPanel({ onDeleteGoal });

    expect(screen.getByRole("button", { name: "Delete Emergency buffer" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Delete Noise-cancelling headphones" }));

    expect(onDeleteGoal).toHaveBeenCalledOnce();
    expect(onDeleteGoal).toHaveBeenCalledWith("goal_headphones");
  });

  it("formats date-only target dates as local calendar dates", () => {
    const originalTimeZone = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";

    try {
      renderGoalsPanel();

      expect(screen.getByText("Safe-buy date Dec 31, 2026")).toBeVisible();
      expect(screen.queryByText(/Dec 30, 2026/)).not.toBeInTheDocument();
    } finally {
      if (originalTimeZone === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = originalTimeZone;
      }
    }
  });

  it("formats ISO datetime target dates by their calendar date component", () => {
    const originalTimeZone = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";

    try {
      renderGoalsPanel({
        snapshot: {
          ...goalsSnapshot,
          goals: [
            {
              ...goalsSnapshot.goals[0],
              targetDate: "2026-12-31T00:00:00.000Z",
            },
          ],
        },
      });

      expect(screen.getByText("Safe-buy date Dec 31, 2026")).toBeVisible();
      expect(screen.queryByText(/Dec 30, 2026/)).not.toBeInTheDocument();
    } finally {
      if (originalTimeZone === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = originalTimeZone;
      }
    }
  });

  it("uses neutral summary copy when there are no goals", () => {
    renderGoalsPanel({ snapshot: { ...goalsSnapshot, goals: [] } });

    const summary = screen.getByTestId("goals-summary-metrics");

    expect(within(summary).getByText("No active funding")).toBeVisible();
    expect(within(summary).queryByText("100% funded")).not.toBeInTheDocument();
  });

  it("does not present zero-target goals as fully funded", () => {
    renderGoalsPanel({
      snapshot: {
        ...goalsSnapshot,
        goals: [
          {
            id: "goal_zero_target",
            label: "Goal without target",
            targetAmount: 0,
            savedAmount: 0,
            monthlyContribution: 1000,
            priority: "low",
          },
        ],
      },
    });

    const goal = screen.getByRole("article", { name: "Goal without target goal" });

    expect(within(goal).getByText("Set target amount")).toBeVisible();
    expect(
      within(goal).getByRole("progressbar", { name: "Goal without target progress" })
    ).toHaveAttribute("aria-valuenow", "0");
    expect(within(goal).queryByText("100% saved")).not.toBeInTheDocument();
  });

  it("shows funded dates for completed goals without fabricating today's date", () => {
    renderGoalsPanel({
      snapshot: {
        ...goalsSnapshot,
        goals: [
          {
            id: "goal_completed",
            label: "Completed trip fund",
            targetAmount: 10000,
            savedAmount: 12000,
            monthlyContribution: 0,
            priority: "medium",
          },
        ],
      },
    });

    const goal = screen.getByRole("article", { name: "Completed trip fund goal" });

    expect(within(goal).getByText("100% saved")).toBeVisible();
    expect(within(goal).getByText("Estimated completion Funded")).toBeVisible();
    expect(within(goal).getByText("Safe-buy date Funded")).toBeVisible();
  });
});
