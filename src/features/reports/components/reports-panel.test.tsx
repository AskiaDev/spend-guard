import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { WeeklyReport } from "@/types/finance";
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

describe("ReportsPanel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the latest weekly advisor report composition", () => {
    render(<ReportsPanel reports={reports} currency="PHP" onGenerateReport={vi.fn()} />);

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

    render(<ReportsPanel reports={reports} currency="PHP" onGenerateReport={vi.fn()} />);

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

    render(<ReportsPanel reports={[]} currency="PHP" onGenerateReport={onGenerateReport} />);

    expect(screen.getByText(/no weekly report yet/i)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Generate Report" }));

    expect(onGenerateReport).toHaveBeenCalledOnce();
  });
});
