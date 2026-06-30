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
    riskScore: 20,
    safeToSpend: 20000,
    monthlyFreeCashFlow: 10000,
    savingsAfterPurchase: 15500,
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
    riskScore: 50,
    safeToSpend: 20000,
    monthlyFreeCashFlow: 10000,
    savingsAfterPurchase: 95000,
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
    expect(screen.getByText(/of ₱10,000 free cash flow/i)).toBeVisible();

    const kpiGrid = screen.getByTestId("dashboard-kpi-grid");
    expect(kpiGrid).toHaveClass("grid-cols-2", "lg:grid-cols-3");

    for (const label of [
      "Current Savings",
      "Safe to Spend",
      "Emergency Progress",
      "Monthly Expenses",
      "Debt Payments",
      "Free Cash Flow (Month)",
      "Total Debt Balance",
      "Goal Funding",
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

    expect(screen.getByRole("heading", { name: "Cash Flow Overview" })).toBeVisible();
    expect(screen.getByTestId("cash-flow-chart")).toBeVisible();

    expect(screen.getByRole("heading", { name: "Goals & Progress" })).toBeVisible();
    expect(screen.getByText("Emergency buffer")).toBeVisible();
    expect(screen.getAllByText("₱120,000 of ₱180,000").length).toBeGreaterThan(0);

    expect(
      screen.getByRole("heading", { name: "Recent Checks & Spending Intelligence" })
    ).toBeVisible();
    expect(screen.getByText("Work bag")).toBeVisible();
    expect(screen.getByText("Weekend trip")).toBeVisible();
    expect(screen.getByText("Safe to Buy")).toBeVisible();
    expect(screen.getByText("Wait")).toBeVisible();

    expect(screen.getByRole("link", { name: "View full strategy report" })).toHaveAttribute(
      "href",
      "/reports"
    );
    expect(screen.getByText("Prioritize debt payoff")).toBeVisible();
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

  it("keeps recent checks visible in the compact intelligence list", () => {
    render(<DashboardOverview snapshot={defaultSnapshot} checks={checks} metrics={metrics} />);

    const secondCheckRow = screen.getByText("Weekend trip").closest("article");

    expect(secondCheckRow).not.toHaveClass("hidden");
    expect(screen.getByRole("button", { name: "More actions for Weekend trip" })).toBeVisible();
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

describe("DashboardOverview — Phase 8 dashboard completeness", () => {
  it("renders the health-status banner from the live health score", () => {
    render(<DashboardOverview snapshot={defaultSnapshot} checks={checks} metrics={metrics} />);

    const banner = screen.getByTestId("health-status-banner");
    expect(within(banner).getByText("Strong")).toBeVisible();
    expect(
      within(banner).getByText(/healthy margin across savings, cash flow, and debt/i)
    ).toBeVisible();
  });

  it("reflects a risky band when the health score is low", () => {
    render(
      <DashboardOverview
        snapshot={defaultSnapshot}
        checks={checks}
        metrics={{ ...metrics, healthScore: 30 }}
      />
    );

    const banner = screen.getByTestId("health-status-banner");
    expect(within(banner).getByText("Risky")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Protect your buffer first" })).toBeVisible();
  });

  it("surfaces estimated variable expenses as a KPI card", () => {
    render(<DashboardOverview snapshot={defaultSnapshot} checks={checks} metrics={metrics} />);

    const card = screen.getByLabelText("Variable Expenses card");
    expect(within(card).getByText("₱12,000")).toBeVisible();
  });

  it("lists debts due within 30 days with their next date, amount, and total", () => {
    render(
      <DashboardOverview
        snapshot={defaultSnapshot}
        checks={checks}
        metrics={metrics}
        referenceDate={new Date(2026, 5, 24)} // 2026-06-24, so dueDay 20 rolls to 2026-07-20
      />
    );

    const card = screen.getByTestId("upcoming-debt-card");
    const row = within(card).getByText("Credit card").closest("li");
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText("₱5,000")).toBeVisible();
    expect(within(row as HTMLElement).getByText("Jul")).toBeVisible();
    expect(within(row as HTMLElement).getByText("20")).toBeVisible();
    expect(within(row as HTMLElement).getByText(/Due in 26 days/)).toBeVisible();
    expect(within(card).getByText(/due across 1 payment/i)).toBeVisible();
  });

  it("lists multiple upcoming payments from the same debt account separately", () => {
    const snapshot: FinancialSnapshot = {
      ...defaultSnapshot,
      debts: [
        {
          id: "tt-loan",
          label: "TT Loan",
          outstandingBalance: 18000,
          minimumPayment: 3000,
          dueDay: 1,
          paymentCadence: "semi_monthly",
          secondDueDay: 16,
        },
        {
          id: "atome",
          label: "Atome",
          outstandingBalance: 10900,
          minimumPayment: 3800,
          dueDay: 6,
        },
      ],
    };

    render(
      <DashboardOverview
        snapshot={snapshot}
        checks={checks}
        metrics={metrics}
        referenceDate={new Date(2026, 5, 30)}
      />
    );

    const card = screen.getByTestId("upcoming-debt-card");
    expect(within(card).getByText(/₱9,800/)).toBeVisible();
    expect(within(card).getByText(/due across 3 payments from 2 debts/i)).toBeVisible();
    expect(within(card).getAllByText("TT Loan")).toHaveLength(2);

    const rows = within(card)
      .getAllByText("TT Loan")
      .map((label) => label.closest("li") as HTMLElement);

    expect(within(rows[0]).getByText("₱3,000")).toBeVisible();
    expect(within(rows[0]).getByText("1")).toBeVisible();
    expect(within(rows[1]).getByText("₱3,000")).toBeVisible();
    expect(within(rows[1]).getByText("16")).toBeVisible();
  });

  it("shows an empty state when no debts are due in the window", () => {
    const snapshotWithoutDebts: FinancialSnapshot = { ...defaultSnapshot, debts: [] };
    render(<DashboardOverview snapshot={snapshotWithoutDebts} checks={checks} metrics={metrics} />);

    const card = screen.getByTestId("upcoming-debt-card");
    expect(
      within(card).getByText(/no debt payments are due in the next 30 days/i)
    ).toBeVisible();
  });

  it("renders the generated advisor insight instead of the static copy", () => {
    render(<DashboardOverview snapshot={defaultSnapshot} checks={checks} metrics={metrics} />);

    expect(screen.getByRole("heading", { name: "You're ahead of the guardrail" })).toBeVisible();
    expect(screen.queryByText("Keep the guardrail active")).not.toBeInTheDocument();
  });
});
