import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("goey-toast", () => ({ gooeyToast: { success: vi.fn(), error: vi.fn() } }));

import { gooeyToast } from "goey-toast";

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
  onUpdateGoal = vi.fn().mockResolvedValue(undefined),
  onDeleteGoal = vi.fn().mockResolvedValue(undefined),
}: {
  snapshot?: FinancialSnapshot;
  monthlyFreeCashFlow?: number;
  onCreateGoal?: (goal: Omit<Goal, "id">) => Promise<Goal | undefined>;
  onUpdateGoal?: (id: string, goal: Omit<Goal, "id">) => Promise<void>;
  onDeleteGoal?: (id: string) => Promise<void>;
} = {}) {
  return render(
    <GoalsPanel
      snapshot={snapshot}
      monthlyFreeCashFlow={monthlyFreeCashFlow}
      onCreateGoal={onCreateGoal}
      onUpdateGoal={onUpdateGoal}
      onDeleteGoal={onDeleteGoal}
    />
  );
}

async function openGoalDrawer(user: ReturnType<typeof userEvent.setup>, goalLabel: string) {
  await user.click(screen.getByRole("button", { name: `View ${goalLabel} details` }));
  return screen.findByRole("dialog");
}

describe("GoalsPanel", () => {
  it("renders summary metrics, a scannable goal list, and advisor guidance", () => {
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

    expect(screen.getByRole("button", { name: "New Goal" })).toBeEnabled();

    // Each goal renders a row that summarizes the key facts and opens its detail drawer.
    const emergencyRow = screen.getByRole("button", { name: "View Emergency buffer details" });
    expect(within(emergencyRow).getByText("Emergency buffer")).toBeVisible();
    expect(within(emergencyRow).getByText("Most important")).toBeVisible();
    expect(within(emergencyRow).getByText("67%")).toBeVisible();
    expect(within(emergencyRow).getByText("Dec 31, 2026")).toBeVisible();

    expect(
      screen.getByRole("button", { name: "View Noise-cancelling headphones details" })
    ).toBeVisible();

    expect(screen.getByText("Goal funding fits inside your current free cash flow.")).toBeVisible();

    expect(screen.getByText("Advisor tip")).toBeVisible();
    expect(
      screen.getByText(/fund the most important goal before flexible wants/i)
    ).toBeVisible();
  });

  it("opens a drawer with the full goal detail when a row is selected", async () => {
    const user = userEvent.setup();
    renderGoalsPanel();

    const drawer = await openGoalDrawer(user, "Emergency buffer");

    expect(within(drawer).getByText("Emergency buffer")).toBeVisible();
    expect(within(drawer).getByText("Most important")).toBeVisible();
    expect(within(drawer).getByText("₱180,000")).toBeVisible();
    expect(within(drawer).getByText("67% of target")).toBeVisible();
    expect(within(drawer).getByText("67% saved")).toBeVisible();
    expect(within(drawer).getByText("₱120,000 of ₱180,000")).toBeVisible();
    expect(within(drawer).getByText("Per payday")).toBeVisible();
    expect(within(drawer).getByText("Every month")).toBeVisible();
    expect(within(drawer).getByText("Realistic")).toBeVisible();
    expect(
      within(drawer).getByRole("progressbar", { name: "Emergency buffer progress" })
    ).toHaveAttribute("aria-valuenow", "67");
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
    // The date field is a shadcn calendar popover: open it and pick a day.
    await user.click(screen.getByLabelText("Target date"));
    await user.click(within(await screen.findByRole("grid")).getByText("15"));
    const now = new Date();
    const expectedTargetDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-15`;
    await user.click(screen.getByLabelText("Priority"));
    await user.click(await screen.findByRole("option", { name: "High priority" }));
    await user.click(screen.getByRole("button", { name: "Create Goal" }));

    expect(onCreateGoal).toHaveBeenCalledWith({
      label: "Camera upgrade",
      targetAmount: 60_000,
      savedAmount: 10_000,
      monthlyContribution: 8_000,
      targetDate: expectedTargetDate,
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

  it("warns at the page level and in the drawer when funding exceeds free cash flow", async () => {
    const user = userEvent.setup();
    renderGoalsPanel({ monthlyFreeCashFlow: 2_000 });

    expect(
      screen.getByText("Planned funding is above your current free cash flow.")
    ).toBeVisible();

    const drawer = await openGoalDrawer(user, "Emergency buffer");
    expect(within(drawer).getByText("Tight plan")).toBeVisible();
  });

  it("uses the profile pay frequency for per-payday guidance in the drawer", async () => {
    const user = userEvent.setup();
    renderGoalsPanel({
      snapshot: {
        ...goalsSnapshot,
        profile: { ...goalsSnapshot.profile, payFrequency: "biweekly" },
        goals: [goalsSnapshot.goals[1]],
      },
    });

    const drawer = await openGoalDrawer(user, "Noise-cancelling headphones");

    expect(within(drawer).getByText("₱2,308")).toBeVisible();
    expect(within(drawer).getByText("Every 2 weeks")).toBeVisible();
  });

  it("deletes a goal from the drawer after confirmation", async () => {
    const user = userEvent.setup();
    const onDeleteGoal = vi.fn().mockResolvedValue(undefined);

    renderGoalsPanel({ onDeleteGoal });

    const drawer = await openGoalDrawer(user, "Noise-cancelling headphones");
    await user.click(within(drawer).getByRole("button", { name: "Delete goal" }));

    const confirm = await screen.findByRole("alertdialog");
    await user.click(within(confirm).getByRole("button", { name: "Remove" }));

    expect(onDeleteGoal).toHaveBeenCalledOnce();
    expect(onDeleteGoal).toHaveBeenCalledWith("goal_headphones");
    expect(gooeyToast.success).toHaveBeenCalledWith("Goal removed");
  });

  it("updates a goal from the drawer edit form", async () => {
    const user = userEvent.setup();
    const onUpdateGoal = vi.fn().mockResolvedValue(undefined);

    renderGoalsPanel({ onUpdateGoal });

    const drawer = await openGoalDrawer(user, "Noise-cancelling headphones");
    await user.click(within(drawer).getByRole("button", { name: "Edit goal" }));
    await user.clear(within(drawer).getByLabelText("Target amount"));
    await user.type(within(drawer).getByLabelText("Target amount"), "30000");
    await user.clear(within(drawer).getByLabelText("Monthly contribution"));
    await user.type(within(drawer).getByLabelText("Monthly contribution"), "6000");
    await user.click(within(drawer).getByRole("button", { name: "Save Goal" }));

    expect(onUpdateGoal).toHaveBeenCalledWith("goal_headphones", {
      label: "Noise-cancelling headphones",
      targetAmount: 30_000,
      savedAmount: 5_000,
      monthlyContribution: 6_000,
      targetDate: "2026-10-15",
      priority: "medium",
    });
    expect(gooeyToast.success).toHaveBeenCalledWith("Goal updated");
  });

  it("formats date-only target dates as local calendar dates", () => {
    const originalTimeZone = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";

    try {
      renderGoalsPanel();

      expect(screen.getByText("Dec 31, 2026")).toBeVisible();
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
          goals: [{ ...goalsSnapshot.goals[0], targetDate: "2026-12-31T00:00:00.000Z" }],
        },
      });

      expect(screen.getByText("Dec 31, 2026")).toBeVisible();
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
    expect(screen.getByText(/add a savings target before taking on flexible wants/i)).toBeVisible();
  });

  it("does not present zero-target goals as fully funded", async () => {
    const user = userEvent.setup();
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

    const drawer = await openGoalDrawer(user, "Goal without target");

    expect(
      within(drawer).getByRole("progressbar", { name: "Goal without target progress" })
    ).toHaveAttribute("aria-valuenow", "0");
    expect(within(drawer).getAllByText("Set target amount").length).toBeGreaterThanOrEqual(1);
    expect(within(drawer).queryByText("100% saved")).not.toBeInTheDocument();
  });

  it("shows funded dates for completed goals without fabricating today's date", async () => {
    const user = userEvent.setup();
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

    const drawer = await openGoalDrawer(user, "Completed trip fund");

    expect(within(drawer).getByText("100% saved")).toBeVisible();
    expect(within(drawer).getAllByText("Funded").length).toBeGreaterThanOrEqual(1);
  });
});
