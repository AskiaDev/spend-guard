import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { financialSnapshotFixture as defaultSnapshot } from "@/test/fixtures/financial-snapshot";
import type { FinancialSnapshot } from "@/types/finance";
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

describe("GoalsPanel", () => {
  it("renders goal summary metrics, detailed cards, and advisor guidance", () => {
    render(<GoalsPanel snapshot={goalsSnapshot} onDeleteGoal={vi.fn()} />);

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
    expect(newGoalButton).toBeDisabled();
    expect(screen.getByText(/goal creation is coming soon/i)).toBeVisible();

    const emergencyGoal = screen.getByRole("article", { name: "Emergency buffer goal" });
    expect(within(emergencyGoal).getByText("Emergency buffer")).toBeVisible();
    expect(within(emergencyGoal).getByText("₱120,000 of ₱180,000")).toBeVisible();
    expect(within(emergencyGoal).getByText("67% saved")).toBeVisible();
    expect(within(emergencyGoal).getByText("₱10,000 monthly contribution")).toBeVisible();
    expect(within(emergencyGoal).getByText("Estimated completion Dec 31, 2026")).toBeVisible();
    expect(within(emergencyGoal).getByText("Safe-buy date Dec 31, 2026")).toBeVisible();
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

    expect(screen.getByText("Advisor tip")).toBeVisible();
    expect(
      screen.getByText(/fund the most important goal before flexible wants/i)
    ).toBeVisible();
  });

  it("keeps goal delete controls accessible and calls the delete mutation", async () => {
    const user = userEvent.setup();
    const onDeleteGoal = vi.fn().mockResolvedValue(undefined);

    render(<GoalsPanel snapshot={goalsSnapshot} onDeleteGoal={onDeleteGoal} />);

    expect(screen.getByRole("button", { name: "Delete Emergency buffer" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Delete Noise-cancelling headphones" }));

    expect(onDeleteGoal).toHaveBeenCalledOnce();
    expect(onDeleteGoal).toHaveBeenCalledWith("goal_headphones");
  });

  it("formats date-only target dates as local calendar dates", () => {
    const originalTimeZone = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";

    try {
      render(<GoalsPanel snapshot={goalsSnapshot} onDeleteGoal={vi.fn()} />);

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
      render(
        <GoalsPanel
          snapshot={{
            ...goalsSnapshot,
            goals: [
              {
                ...goalsSnapshot.goals[0],
                targetDate: "2026-12-31T00:00:00.000Z",
              },
            ],
          }}
          onDeleteGoal={vi.fn()}
        />
      );

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
    render(<GoalsPanel snapshot={{ ...goalsSnapshot, goals: [] }} onDeleteGoal={vi.fn()} />);

    const summary = screen.getByTestId("goals-summary-metrics");

    expect(within(summary).getByText("No active funding")).toBeVisible();
    expect(within(summary).queryByText("100% funded")).not.toBeInTheDocument();
  });

  it("does not present zero-target goals as fully funded", () => {
    render(
      <GoalsPanel
        snapshot={{
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
        }}
        onDeleteGoal={vi.fn()}
      />
    );

    const goal = screen.getByRole("article", { name: "Goal without target goal" });

    expect(within(goal).getByText("Set target amount")).toBeVisible();
    expect(
      within(goal).getByRole("progressbar", { name: "Goal without target progress" })
    ).toHaveAttribute("aria-valuenow", "0");
    expect(within(goal).queryByText("100% saved")).not.toBeInTheDocument();
  });

  it("shows funded dates for completed goals without fabricating today's date", () => {
    render(
      <GoalsPanel
        snapshot={{
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
        }}
        onDeleteGoal={vi.fn()}
      />
    );

    const goal = screen.getByRole("article", { name: "Completed trip fund goal" });

    expect(within(goal).getByText("100% saved")).toBeVisible();
    expect(within(goal).getByText("Estimated completion Funded")).toBeVisible();
    expect(within(goal).getByText("Safe-buy date Funded")).toBeVisible();
  });
});
