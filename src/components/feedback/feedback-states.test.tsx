import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "@/components/ui/button";
import { OnboardingSetup } from "@/features/onboarding";
import { ReportsPanel } from "@/features/reports";
import { financialSnapshotFixture as defaultSnapshot } from "@/test/fixtures/financial-snapshot";
import type { WeeklyReport } from "@/types/finance";
import { EmptyState } from "./empty-state";
import { InlineNotice } from "./inline-notice";
import { PageSkeleton } from "./page-skeleton";

describe("feedback states", () => {
  it("uses stable accessible semantics for skeleton, error, success, empty, and loading states", () => {
    render(
      <>
        <PageSkeleton cardCount={2} label="Loading dashboard" />
        <InlineNotice tone="error">We could not save your changes.</InlineNotice>
        <InlineNotice tone="success">Your goal was updated.</InlineNotice>
        <EmptyState
          title="No saved checks"
          description="Run a purchase check to create your first decision."
          action={<Button>Run check</Button>}
        />
        <Button type="button" isLoading loadingText="Generating report">
          Generate Report
        </Button>
      </>
    );

    const skeleton = screen.getByRole("status", { name: "Loading dashboard" });
    expect(skeleton).toHaveAttribute("aria-busy", "true");
    expect(skeleton.querySelectorAll("[data-skeleton-card]")).toHaveLength(2);
    expect(screen.getByRole("alert")).toHaveTextContent("We could not save your changes.");
    expect(screen.getByText("Your goal was updated.").closest('[role="status"]')).toHaveAttribute(
      "aria-live",
      "polite"
    );

    const emptyState = screen.getByRole("region", { name: "No saved checks" });
    expect(within(emptyState).getByRole("button", { name: "Run check" })).toBeVisible();
    expect(within(emptyState).getAllByRole("button")).toHaveLength(1);

    const loadingButton = screen.getByRole("button", { name: "Generate Report" });
    expect(loadingButton).toHaveAttribute("aria-busy", "true");
    expect(loadingButton).toBeDisabled();
    expect(screen.getByText("Generating report")).toHaveAttribute("aria-hidden", "true");
  });

  it("keeps the Generate Report action name and shows a retryable error when generation fails", async () => {
    const user = userEvent.setup();
    let rejectReport: (error: Error) => void = () => {};
    const reportPromise = new Promise<WeeklyReport>((_resolve, reject) => {
      rejectReport = reject;
    });
    const onGenerateReport = vi.fn(() => reportPromise);

    render(<ReportsPanel reports={[]} currency="PHP" onGenerateReport={onGenerateReport} />);

    await user.click(screen.getByRole("button", { name: "Generate Report" }));

    expect(screen.getByRole("button", { name: "Generate Report" })).toHaveAttribute(
      "aria-busy",
      "true"
    );

    rejectReport(new Error("report failed"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn’t generate this report. Your saved data is unchanged—please try again."
    );
    expect(onGenerateReport).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Generate Report" })).not.toHaveAttribute(
      "aria-busy"
    );
  });

  it("shows a setup save error without discarding entered onboarding values", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValue(new Error("save failed"));

    render(<OnboardingSetup snapshot={defaultSnapshot} isHydrated={true} onSave={onSave} />);

    const income = screen.getByLabelText("Monthly income");
    await user.clear(income);
    await user.type(income, "90000");

    while (!screen.queryByRole("heading", { name: "Review your setup" })) {
      await user.click(screen.getByRole("button", { name: "Continue" }));
    }

    await user.click(screen.getByRole("button", { name: "Finish Setup" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn’t save setup. Your details are still here—please try again."
    );
    expect(screen.getByRole("button", { name: "Finish Setup" })).not.toHaveAttribute("aria-busy");

    await user.click(screen.getByRole("button", { name: "Back" }));
    await user.click(screen.getByRole("button", { name: "Back" }));
    await user.click(screen.getByRole("button", { name: "Back" }));
    await user.click(screen.getByRole("button", { name: "Back" }));
    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByLabelText("Monthly income")).toHaveValue(90000);
  });

  it("defines global reduced-motion rules for decorative animation and transitions", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("animation-duration: 0.001ms");
    expect(css).toContain("transition-duration: 0.001ms");
    expect(css).toContain("scroll-behavior: auto");
  });
});
