import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { financialSnapshotFixture as defaultSnapshot } from "@/test/fixtures/financial-snapshot";
import type { FinancialSnapshot, PurchaseCheck } from "@/types/finance";
import { DashboardOverview } from "./dashboard-overview";

const metrics = {
  safeToSpend: 20000,
  monthlyFreeCashFlow: 10000,
  healthScore: 82,
};

const checks: PurchaseCheck[] = [
  {
    id: "check_work_bag",
    itemName: "Work bag",
    amount: 4500,
    urgency: "need_this_month",
    paymentMethod: "cash",
    createdAt: "2026-06-20T00:00:00.000Z",
    decision: "SAFE_TO_BUY",
    safeToSpend: 20000,
    monthlyFreeCashFlow: 10000,
    cooldownDays: 0,
    advisorText: "This fits inside your current monthly plan.",
    reasons: ["The purchase fits inside today's safe-to-spend amount."],
  },
  {
    id: "check_weekend_trip",
    itemName: "Weekend trip",
    amount: 25000,
    urgency: "want",
    paymentMethod: "credit_card",
    createdAt: "2026-06-18T00:00:00.000Z",
    decision: "WAIT",
    safeToSpend: 20000,
    monthlyFreeCashFlow: 10000,
    cooldownDays: 21,
    advisorText: "Wait until your emergency buffer is closer to target.",
    reasons: ["The purchase is above today's safe-to-spend amount."],
  },
];

const snapshotWithoutGoals: FinancialSnapshot = {
  ...defaultSnapshot,
  goals: [],
};

describe("DashboardOverview", () => {
  it("renders the redesigned dashboard from live snapshot, check, and metric data", () => {
    render(<DashboardOverview snapshot={defaultSnapshot} checks={checks} metrics={metrics} />);

    expect(screen.queryByText("Monthly Flow")).not.toBeInTheDocument();
    expect(screen.getByText(/safe to spend is a guardrail/i)).toBeVisible();

    const kpiGrid = screen.getByTestId("dashboard-kpi-grid");
    expect(kpiGrid).toHaveClass("grid-cols-2", "lg:grid-cols-3");

    for (const label of [
      "Current Savings",
      "Safe to Spend",
      "Emergency Progress",
      "Monthly Expenses",
      "Debt Payments",
      "Free Cash Flow",
    ]) {
      expect(screen.getByRole("heading", { name: label })).toBeVisible();
    }

    const savingsCard = screen.getByLabelText("Current Savings card");
    expect(within(savingsCard).getByText("₱120,000")).toBeVisible();

    const safeToSpendCard = screen.getByLabelText("Safe to Spend card");
    expect(within(safeToSpendCard).getByText("₱20,000")).toBeVisible();

    expect(
      screen.getByRole("progressbar", { name: "Emergency fund progress" })
    ).toHaveAttribute("aria-valuenow", "67");
    expect(screen.getByRole("meter", { name: "Financial health score" })).toHaveAttribute(
      "aria-valuenow",
      "82"
    );

    expect(screen.getByRole("heading", { name: "Active Goals" })).toBeVisible();
    expect(screen.getByText("Emergency buffer")).toBeVisible();
    expect(screen.getByText("₱120,000 of ₱180,000")).toBeVisible();

    expect(screen.getByRole("heading", { name: "Recent Checks" })).toBeVisible();
    expect(screen.getByText("Work bag")).toBeVisible();
    expect(screen.getByText("Weekend trip")).toBeVisible();
    expect(screen.getByText("Safe to Buy")).toBeVisible();
    expect(screen.getByText("Wait")).toBeVisible();

    expect(screen.getByRole("link", { name: "Read full insight" })).toHaveAttribute(
      "href",
      "/reports"
    );
    expect(screen.getByRole("img", { name: "Person reviewing personal finance progress" })).toHaveAttribute(
      "src",
      expect.stringContaining("personal-finance.svg")
    );
  });

  it("shows a labelled empty state when no purchase checks have been persisted", () => {
    render(<DashboardOverview snapshot={defaultSnapshot} checks={[]} metrics={metrics} />);

    expect(screen.getByRole("heading", { name: "Run your first purchase check" })).toBeVisible();
    expect(screen.getByRole("img", { name: "Person entering payment details" })).toHaveAttribute(
      "src",
      expect.stringContaining("payment-info.svg")
    );
    expect(screen.getByRole("link", { name: "Run your first purchase check" })).toHaveAttribute(
      "href",
      "/checker"
    );
    expect(screen.getByText(/example-only/i)).toBeVisible();
  });

  it("links the empty goals action to the goals page", () => {
    render(<DashboardOverview snapshot={snapshotWithoutGoals} checks={checks} metrics={metrics} />);

    expect(screen.getByRole("img", { name: "Person reviewing personal finance goals" })).toHaveAttribute(
      "src",
      expect.stringContaining("personal-finance.svg")
    );
    expect(screen.getByRole("link", { name: "Add first goal" })).toHaveAttribute(
      "href",
      "/goals"
    );
  });

  it("keeps additional recent checks hidden until the lg breakpoint", () => {
    render(<DashboardOverview snapshot={defaultSnapshot} checks={checks} metrics={metrics} />);

    const secondCheckRow = screen.getByText("Weekend trip").closest("article");

    expect(secondCheckRow).toHaveClass("hidden", "lg:grid");
    expect(secondCheckRow).not.toHaveClass("md:grid");
  });

  it("renders date-only goal targets as local calendar dates across time zones", () => {
    const originalTimeZone = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";

    try {
      render(<DashboardOverview snapshot={defaultSnapshot} checks={checks} metrics={metrics} />);

      expect(screen.getByText(/Target Dec 31/)).toBeVisible();
    } finally {
      if (originalTimeZone === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = originalTimeZone;
      }
    }
  });
});
