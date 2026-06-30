import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PurchaseResult } from "./purchase-result";
import type { PurchaseCheck } from "@/types/finance";

const activeCheck: PurchaseCheck = {
  id: "check_iphone",
  createdAt: "2026-06-21T00:00:00.000Z",
  itemName: "iPhone Pro Max 1TB",
  amount: 170000,
  category: "phone",
  saleDeadline: "2026-07-15",
  location: "Makati showroom",
  notes: "Ask if delivery is included.",
  urgency: "can_wait",
  paymentMethod: "installment",
  installmentMonths: 24,
  monthlyPayment: 6000,
  decision: "NOT_RECOMMENDED",
  riskScore: 95,
  safeToSpend: 20000,
  monthlyFreeCashFlow: 10000,
  savingsAfterPurchase: 120000,
  emergencyProgress: 0.5,
  debtPressure: 0.18,
  goalDelayMonths: 3,
  healthScore: 74,
  cooldownDays: 30,
  status: "checked",
  advisorText: "Waiting protects your emergency savings and keeps your monthly plan flexible.",
  reasons: [
    "The price is above your current safe-to-spend amount.",
    "The monthly payment would reduce your free cash flow.",
    "Your emergency fund is still in progress.",
    "The purchase can wait without affecting essentials.",
    "A savings goal avoids adding a long payment commitment.",
  ],
};

describe("PurchaseResult", () => {
  it("renders a complete not-recommended decision and passes the active check to actions", async () => {
    const user = userEvent.setup();
    const onAddGoal = vi.fn().mockResolvedValue(undefined);
    const onAddCooldown = vi.fn().mockResolvedValue(undefined);
    const onMarkStatus = vi.fn().mockResolvedValue(undefined);

    render(
      <PurchaseResult
        check={activeCheck}
        currency="PHP"
        onAddGoal={onAddGoal}
        onAddCooldown={onAddCooldown}
        onMarkStatus={onMarkStatus}
      />
    );

    const status = screen.getByText("Not Recommended").closest("span");
    expect(status).toHaveClass("text-risk");
    expect(screen.getByRole("meter", { name: "Decision confidence" })).toHaveTextContent(
      /92\s*\/\s*100/
    );
    expect(
      screen.getByText(
        "This purchase is not recommended right now because it would put too much pressure on your current plan."
      )
    ).toBeVisible();

    const summary = screen.getByRole("region", { name: "Purchase summary" });
    expect(within(summary).getByText("iPhone Pro Max 1TB")).toBeVisible();
    expect(within(summary).getByText(/installment/i)).toBeVisible();
    expect(within(summary).getByText(/24 months/i)).toBeVisible();
    expect(within(summary).getByText("Phone")).toBeVisible();
    expect(within(summary).getByText("Makati showroom")).toBeVisible();
    expect(within(summary).getByText("Jul 15, 2026")).toBeVisible();

    const impact = screen.getByRole("region", { name: "Plan impact" });
    expect(within(impact).getByText("Purchase price")).toBeVisible();
    expect(within(impact).getByText("₱170,000")).toBeVisible();
    expect(within(impact).getByText("Risk score")).toBeVisible();
    expect(within(impact).getByText("95 / 100")).toBeVisible();
    expect(within(impact).getByText("Very high")).toBeVisible();
    expect(within(impact).getByText("Goal delay")).toBeVisible();
    expect(within(impact).getByText("3 months")).toBeVisible();
    expect(within(impact).getByText("Safe to spend")).toBeVisible();
    expect(within(impact).getByText("₱20,000")).toBeVisible();

    const reasons = screen.getByRole("region", { name: "Why this decision" });
    expect(within(reasons).getAllByRole("listitem")).toHaveLength(5);
    for (const reason of activeCheck.reasons) {
      expect(within(reasons).getByText(reason)).toBeVisible();
    }

    const advisor = screen.getByRole("region", { name: "Advisor explanation" });
    expect(within(advisor).getByText(activeCheck.advisorText)).toBeVisible();
    expect(screen.getByText("Recommended action")).toBeVisible();
    expect(screen.getByText("Pause this purchase")).toBeVisible();
    expect(screen.getByText("Use the cooldown period, and save toward it as a goal.")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Add to Goal" }));
    expect(screen.getByRole("status")).toHaveTextContent("Goal created from this check.");
    await user.click(screen.getByRole("button", { name: "Add to Cooldown" }));
    await user.click(screen.getByRole("button", { name: "Mark as bought" }));

    expect(onAddGoal).toHaveBeenCalledWith(activeCheck);
    expect(onAddCooldown).toHaveBeenCalledWith(activeCheck);
    expect(onMarkStatus).toHaveBeenCalledWith(activeCheck, "bought");
    expect(screen.getByText("Bought")).toBeVisible();
    expect(screen.getByRole("link", { name: "Check Another Purchase" })).toHaveAttribute(
      "href",
      "/checker"
    );
    expect(screen.getByRole("link", { name: "Back to Dashboard" })).toHaveAttribute("href", "/");
  });

  it("prevents duplicate mutations and disables both actions while one is pending", async () => {
    const user = userEvent.setup();
    let resolveGoal: () => void = () => {};
    const pendingGoal = new Promise<void>((resolve) => {
      resolveGoal = resolve;
    });
    const onAddGoal = vi.fn(() => pendingGoal);
    const onAddCooldown = vi.fn().mockResolvedValue(undefined);

    render(
      <PurchaseResult
        check={activeCheck}
        currency="PHP"
        onAddGoal={onAddGoal}
        onAddCooldown={onAddCooldown}
      />
    );

    await user.click(screen.getByRole("button", { name: "Add to Goal" }));

    expect(onAddGoal).toHaveBeenCalledOnce();
    expect(onAddGoal).toHaveBeenCalledWith(activeCheck);
    expect(screen.getByRole("button", { name: "Add to Goal" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add to Cooldown" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Add to Goal" }));
    await user.click(screen.getByRole("button", { name: "Add to Cooldown" }));

    expect(onAddGoal).toHaveBeenCalledOnce();
    expect(onAddCooldown).not.toHaveBeenCalled();

    resolveGoal();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Add to Goal" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Add to Cooldown" })).toBeEnabled();
    });
  });

  it("shows rejected mutation feedback, preserves the result, and allows retry", async () => {
    const user = userEvent.setup();
    const onAddGoal = vi
      .fn()
      .mockRejectedValueOnce(new Error("storage unavailable"))
      .mockResolvedValueOnce(undefined);

    render(
      <PurchaseResult
        check={activeCheck}
        currency="PHP"
        onAddGoal={onAddGoal}
        onAddCooldown={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Add to Goal" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn’t add this purchase to a goal. Please try again."
    );
    expect(screen.getByRole("region", { name: "Purchase summary" })).toHaveTextContent(
      activeCheck.itemName
    );
    expect(screen.getByRole("button", { name: "Add to Goal" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Add to Goal" }));

    expect(onAddGoal).toHaveBeenCalledTimes(2);
    expect(onAddGoal).toHaveBeenNthCalledWith(1, activeCheck);
    expect(onAddGoal).toHaveBeenNthCalledWith(2, activeCheck);
  });

  it("shows retryable feedback when marking a check status fails", async () => {
    const user = userEvent.setup();
    const onMarkStatus = vi
      .fn()
      .mockRejectedValueOnce(new Error("status unavailable"))
      .mockResolvedValueOnce(undefined);

    render(
      <PurchaseResult
        check={activeCheck}
        currency="PHP"
        onAddGoal={vi.fn()}
        onAddCooldown={vi.fn()}
        onMarkStatus={onMarkStatus}
      />
    );

    await user.click(screen.getByRole("button", { name: "Mark as skipped" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn’t update this purchase status. Please try again."
    );
    expect(screen.getByText("Checked")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Mark as skipped" }));

    expect(onMarkStatus).toHaveBeenCalledTimes(2);
    expect(onMarkStatus).toHaveBeenNthCalledWith(1, activeCheck, "skipped");
    expect(onMarkStatus).toHaveBeenNthCalledWith(2, activeCheck, "skipped");
    expect(screen.getByText("Skipped")).toBeVisible();
  });

  it("supplements a one-reason live check with five presentation explanations", () => {
    const storedReason = "The purchase exceeds the current safe-to-spend amount.";

    render(
      <PurchaseResult
        check={{ ...activeCheck, id: "check_one_reason", reasons: [storedReason] }}
        currency="PHP"
        onAddGoal={vi.fn()}
        onAddCooldown={vi.fn()}
      />
    );

    const reasons = screen.getByRole("region", { name: "Why this decision" });
    expect(within(reasons).getAllByRole("listitem")).toHaveLength(5);
    expect(within(reasons).getByText(storedReason)).toBeVisible();
  });

  it("does not truncate a future check with more than five stored reasons", () => {
    const storedReasons = Array.from({ length: 6 }, (_, index) => `Stored reason ${index + 1}`);

    render(
      <PurchaseResult
        check={{ ...activeCheck, id: "check_six_reasons", reasons: storedReasons }}
        currency="PHP"
        onAddGoal={vi.fn()}
        onAddCooldown={vi.fn()}
      />
    );

    const reasons = screen.getByRole("region", { name: "Why this decision" });
    expect(within(reasons).getAllByRole("listitem")).toHaveLength(6);
    for (const reason of storedReasons) {
      expect(within(reasons).getByText(reason)).toBeVisible();
    }
  });

  it("pins the iPhone fallback to PHP and labels its currency as example content", () => {
    render(
      <PurchaseResult
        currency="USD"
        onAddGoal={vi.fn()}
        onAddCooldown={vi.fn()}
      />
    );

    expect(screen.getByText("Example decision")).toBeVisible();
    expect(
      screen.getByText("Sample only — this is not your financial data. Values are shown in PHP.")
    ).toBeVisible();
    const summary = screen.getByRole("region", { name: "Purchase summary" });
    expect(summary).toHaveTextContent("iPhone Pro Max 1TB");
    const impact = screen.getByRole("region", { name: "Plan impact" });
    expect(within(impact).getByText("₱170,000")).toBeVisible();
  });
});
