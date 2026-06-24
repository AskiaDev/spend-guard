import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { financialSnapshotFixture as snapshot } from "@/test/fixtures/financial-snapshot";
import type { PurchaseCheck, WeeklyReport } from "@/types/finance";
import { ReportsPanel } from "./reports-panel";

const reports: WeeklyReport[] = [
  {
    id: "report_previous",
    createdAt: "2026-06-14T23:00:00.000Z",
    weekStart: "2026-06-08",
    summary: "Older weekly summary.",
    healthScore: 64,
    safeToSpend: 12000,
  },
  {
    id: "report_latest",
    createdAt: "2026-06-21T23:00:00.000Z",
    weekStart: "2026-06-15",
    summary: "You avoided impulse buys and kept cash flow positive.",
    healthScore: 78,
    safeToSpend: 24000,
  },
];

// Checks inside the latest report's week (2026-06-15 .. 2026-06-21).
const checks: PurchaseCheck[] = [
  {
    id: "wk_skip",
    itemName: "Sneakers",
    amount: 4000,
    urgency: "want",
    paymentMethod: "cash",
    createdAt: "2026-06-16T10:00:00.000Z",
    decision: "WAIT",
    riskScore: 55,
    safeToSpend: 24000,
    monthlyFreeCashFlow: 10000,
    savingsAfterPurchase: 20000,
    cooldownDays: 7,
    advisorText: "",
    reasons: [],
    status: "skipped",
  },
  {
    id: "wk_safe",
    itemName: "Groceries",
    amount: 2000,
    urgency: "need_now",
    paymentMethod: "cash",
    createdAt: "2026-06-17T10:00:00.000Z",
    decision: "SAFE_TO_BUY",
    riskScore: 10,
    safeToSpend: 24000,
    monthlyFreeCashFlow: 10000,
    savingsAfterPurchase: 22000,
    cooldownDays: 0,
    advisorText: "",
    reasons: [],
    status: "bought",
  },
];

function renderPanel(props: Partial<Parameters<typeof ReportsPanel>[0]> = {}) {
  return render(
    <ReportsPanel
      reports={reports}
      checks={checks}
      snapshot={snapshot}
      currency="PHP"
      onGenerateReport={vi.fn()}
      {...props}
    />
  );
}

describe("ReportsPanel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the latest weekly advisor report composition", () => {
    renderPanel();

    expect(screen.getByText("Jun 15, 2026 – Jun 21, 2026")).toBeVisible();
    expect(screen.getByRole("button", { name: "Download Report" })).toBeVisible();
    expect(screen.getByText("78/100")).toBeVisible();
    expect(screen.getByText("You avoided impulse buys and kept cash flow positive.")).toBeVisible();
    expect(screen.getByRole("img", { name: "Person reviewing a weekly progress overview" })).toHaveAttribute(
      "src",
      expect.stringContaining("progress-overview.svg")
    );

    for (const label of [
      "Good Decisions",
      "Improved Items",
      "Current Risks",
      "Purchases Avoided",
      "Goal Progress",
      "Next Best Action",
      "Coach Tip",
      "Educational Tip",
    ]) {
      expect(screen.getByText(label)).toBeVisible();
    }

    expect(screen.getByText(/reference insights/i)).toBeVisible();
    expect(screen.getByRole("link", { name: "Take Action" })).toHaveAttribute("href", "/checker");
    expect(screen.getByTestId("mobile-report-cta")).toHaveClass("sticky");
  });

  it("renders data-driven good-decision and amount-preserved metrics from the week's checks", () => {
    renderPanel();

    const goodDecisions = screen.getByLabelText("Good Decisions card");
    expect(within(goodDecisions).getByText("2")).toBeVisible();

    const avoided = screen.getByLabelText("Purchases Avoided card");
    expect(within(avoided).getByText("₱4,000")).toBeVisible();
    expect(within(avoided).getByText(/1 want skipped/i)).toBeVisible();
  });

  it("lists earlier weekly reports in the history section", () => {
    renderPanel();

    expect(screen.getByRole("heading", { name: "Report history" })).toBeVisible();
    expect(screen.getByText("Older weekly summary.")).toBeVisible();
    expect(screen.getByText("Jun 8, 2026 – Jun 14, 2026")).toBeVisible();
  });

  it("downloads a local text report and immediately revokes the Blob URL", async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn((blob: Blob) => {
      expect(blob).toBeInstanceOf(Blob);
      return "blob:weekly-report";
    });
    const revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });

    renderPanel();

    await user.click(screen.getByRole("button", { name: "Download Report" }));

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:weekly-report");
  });

  it("keeps report generation wired when no report exists", async () => {
    const user = userEvent.setup();
    const onGenerateReport = vi.fn().mockResolvedValue({
      ...reports[0],
      id: "report_generated",
    });

    renderPanel({ reports: [], onGenerateReport });

    expect(screen.getByText(/no weekly report yet/i)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Generate Report" }));

    expect(onGenerateReport).toHaveBeenCalledOnce();
  });
});
