import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "@/components/ui/button";
import type { PurchaseDecision } from "@/types/finance";
import { EmptyState } from "../feedback/empty-state";
import { InlineNotice } from "../feedback/inline-notice";
import { PageSkeleton } from "../feedback/page-skeleton";
import { ProgressRing } from "./progress-ring";
import { ScoreGauge } from "./score-gauge";
import { StatusBadge, decisionLabels } from "./status-badge";
import { StepProgress } from "./step-progress";

describe("StatusBadge", () => {
  it("renders every purchase decision with its exact label and a non-color indicator", () => {
    const decisions: PurchaseDecision[] = [
      "SAFE_TO_BUY",
      "BUY_WITH_CAUTION",
      "WAIT",
      "NOT_RECOMMENDED",
    ];

    render(
      <div>
        {decisions.map((decision) => (
          <StatusBadge key={decision} decision={decision} />
        ))}
      </div>
    );

    expect(decisionLabels).toEqual({
      SAFE_TO_BUY: "Safe to Buy",
      BUY_WITH_CAUTION: "Buy with Caution",
      WAIT: "Wait",
      NOT_RECOMMENDED: "Not Recommended",
    });

    for (const decision of decisions) {
      const label = screen.getByText(decisionLabels[decision]);
      const badge = label.closest("span");
      const icon = badge?.querySelector("svg[aria-hidden='true']");

      expect(label).toBeVisible();
      expect(icon).toBeVisible();
    }
  });
});

describe("ProgressRing", () => {
  it("exposes a named numeric progressbar and SVG circle progress", () => {
    render(<ProgressRing value={68} label="Emergency fund progress" />);

    const progressbar = screen.getByRole("progressbar", {
      name: "Emergency fund progress",
    });
    const circles = progressbar.querySelectorAll("circle");

    expect(progressbar).toHaveAttribute("aria-valuemin", "0");
    expect(progressbar).toHaveAttribute("aria-valuemax", "100");
    expect(progressbar).toHaveAttribute("aria-valuenow", "68");
    expect(circles).toHaveLength(2);
    expect(circles[1]).toHaveAttribute("stroke-dasharray");
    expect(circles[1]).toHaveAttribute("stroke-dashoffset");
  });

  it("clamps values to the supported range", () => {
    render(
      <>
        <ProgressRing value={-12} label="Lower bound" />
        <ProgressRing value={124} label="Upper bound" />
      </>
    );

    expect(screen.getByRole("progressbar", { name: "Lower bound" })).toHaveAttribute(
      "aria-valuenow",
      "0"
    );
    expect(screen.getByRole("progressbar", { name: "Upper bound" })).toHaveAttribute(
      "aria-valuenow",
      "100"
    );
  });

  it("falls back to valid SVG geometry for invalid size props", () => {
    render(
      <ProgressRing
        value={50}
        label="Invalid geometry"
        size={Number.NaN}
        strokeWidth={Number.NaN}
      />
    );

    const progressbar = screen.getByRole("progressbar", { name: "Invalid geometry" });
    const svg = progressbar.querySelector("svg");
    const circles = progressbar.querySelectorAll("circle");

    expect(progressbar).toHaveStyle({ width: "96px", height: "96px" });
    expect(svg).toHaveAttribute("viewBox", "0 0 96 96");
    expect(circles[0]).toHaveAttribute("r", "44");
    expect(circles[1]).toHaveAttribute("stroke-width", "8");
  });
});

describe("ScoreGauge", () => {
  it("renders a labelled semicircle gauge and the score out of 100", () => {
    render(<ScoreGauge score={68} label="Financial health score" />);

    const meter = screen.getByRole("meter", { name: "Financial health score" });

    expect(within(meter).getByText("68 / 100")).toBeVisible();
    expect(meter).toHaveAttribute("aria-valuenow", "68");
    expect(meter.querySelectorAll("path")).toHaveLength(2);
  });

  it("clamps the rendered score defensively", () => {
    render(<ScoreGauge score={140} label="Upper score" />);

    const meter = screen.getByRole("meter", { name: "Upper score" });

    expect(within(meter).getByText("100 / 100")).toBeVisible();
    expect(meter).toHaveAttribute("aria-valuenow", "100");
  });
});

describe("StepProgress", () => {
  it("uses an ordered list with accessible completed and current step states", () => {
    render(
      <StepProgress
        currentStep={2}
        steps={[
          { label: "Financial profile" },
          { label: "Purchase details" },
          { label: "Review" },
        ]}
      />
    );

    expect(screen.getByRole("list").tagName).toBe("OL");

    const completedStep = screen.getByRole("listitem", {
      name: "Financial profile, completed",
    });
    expect(completedStep.querySelector("svg[aria-hidden='true']")).toBeVisible();

    expect(
      screen.getByRole("listitem", { name: "Purchase details, current step" })
    ).toHaveAttribute("aria-current", "step");
    expect(screen.getByText("Review")).toBeVisible();
  });

  it("defaults invalid current steps to the first step", () => {
    render(
      <StepProgress
        currentStep={Number.NaN}
        steps={[
          { label: "Financial profile" },
          { label: "Purchase details" },
        ]}
      />
    );

    expect(
      screen.getByRole("listitem", { name: "Financial profile, current step" })
    ).toHaveAttribute("aria-current", "step");
  });
});

describe("feedback states", () => {
  it("announces error notices immediately", () => {
    render(<InlineNotice tone="error">We could not save your changes.</InlineNotice>);

    expect(screen.getByRole("alert")).toHaveTextContent("We could not save your changes.");
  });

  it("announces success notices politely", () => {
    render(<InlineNotice tone="success">Your goal was updated.</InlineNotice>);

    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  it("renders an accessible loading state with stable reduced-motion cards", () => {
    render(<PageSkeleton cardCount={2} label="Loading dashboard" />);

    const status = screen.getByRole("status", { name: "Loading dashboard" });
    const cards = status.querySelectorAll("[data-skeleton-card]");

    expect(cards).toHaveLength(2);
    for (const card of cards) {
      expect(card).toHaveClass("min-h-48", "animate-pulse", "motion-reduce:animate-none");
    }
  });

  it("presents accessible empty-state content with one clear action slot", () => {
    render(
      <EmptyState
        title="No goals yet"
        description="Create a savings goal to track your progress."
        action={<Button>Create goal</Button>}
        illustration={{
          src: "/illustrations/personal-finance.svg",
          alt: "Person reviewing personal finance goals",
          width: 180,
          height: 150,
        }}
      />
    );

    expect(screen.getByRole("heading", { name: "No goals yet" })).toBeVisible();
    expect(screen.getByRole("img", { name: "Person reviewing personal finance goals" })).toHaveAttribute(
      "src",
      expect.stringContaining("personal-finance.svg")
    );
    expect(screen.getByText("Create a savings goal to track your progress.")).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Create goal" })).toHaveLength(1);
  });
});
