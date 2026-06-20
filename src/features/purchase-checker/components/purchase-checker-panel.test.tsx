import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { defaultSnapshot } from "@/lib/storage/default-data";
import { PurchaseCheckerPanel } from "./purchase-checker-panel";
import type { PurchaseCheck } from "@/types/finance";

const props = {
  snapshot: defaultSnapshot,
  onRunCheck: vi.fn(),
  onAddGoal: vi.fn(),
  onAddCooldown: vi.fn(),
};

describe("PurchaseCheckerPanel", () => {
  it("requires monthly payment for installment checks", async () => {
    const user = userEvent.setup();
    const onRunCheck = vi.fn();

    render(<PurchaseCheckerPanel {...props} onRunCheck={onRunCheck} />);

    await user.type(screen.getByLabelText(/purchase/i), "Phone");
    await user.clear(screen.getByLabelText(/^amount$/i));
    await user.type(screen.getByLabelText(/^amount$/i), "25000");
    await user.selectOptions(screen.getByLabelText(/^payment$/i), "installment");
    await user.click(screen.getByRole("button", { name: /check purchase/i }));

    expect(
      await screen.findByText(/enter the monthly payment for this payment method/i)
    ).toBeInTheDocument();
    expect(onRunCheck).not.toHaveBeenCalled();
  });

  it("copies confirmed voice draft fields into the purchase form before analysis", async () => {
    const user = userEvent.setup();

    render(<PurchaseCheckerPanel {...props} />);

    await user.type(
      screen.getByLabelText(/voice transcript/i),
      "Can I buy a phone for 25k on installment, 12 months at 2500 per month? I can wait."
    );
    await user.click(screen.getByRole("button", { name: /parse transcript/i }));
    expect(await screen.findByText(/review the extracted fields/i)).toBeInTheDocument();
    expect(screen.getByText("₱25,000")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /confirm fields/i }));

    await waitFor(() => expect(screen.getByLabelText(/purchase/i)).toHaveValue("phone"));
    expect(screen.getByLabelText(/^amount$/i)).toHaveValue(25000);
    expect(screen.getByLabelText(/^payment$/i)).toHaveValue("installment");
  });

  it("shows voice fallback when speech capture is unavailable", async () => {
    const user = userEvent.setup();

    render(<PurchaseCheckerPanel {...props} />);

    await user.click(screen.getByRole("button", { name: /record/i }));

    expect(await screen.findByText(/voice capture is unavailable/i)).toBeInTheDocument();
  });

  it("renders latest decision actions", async () => {
    const user = userEvent.setup();
    const onAddGoal = vi.fn().mockResolvedValue(undefined);
    const onAddCooldown = vi.fn().mockResolvedValue(undefined);
    const latestCheck: PurchaseCheck = {
      id: "check_1",
      itemName: "Keyboard",
      amount: 4500,
      urgency: "need_this_month",
      paymentMethod: "cash",
      createdAt: "2026-06-20T00:00:00.000Z",
      decision: "SAFE_TO_BUY",
      safeToSpend: 18000,
      monthlyFreeCashFlow: 48000,
      cooldownDays: 0,
      advisorText: "This fits your plan.",
      reasons: ["The purchase fits inside today's safe-to-spend amount."],
    };

    render(
      <PurchaseCheckerPanel
        {...props}
        latestCheck={latestCheck}
        onAddGoal={onAddGoal}
        onAddCooldown={onAddCooldown}
      />
    );

    expect(screen.getByText("safe to buy")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /convert to goal/i }));
    await user.click(screen.getByRole("button", { name: /add cooldown/i }));

    expect(onAddGoal).toHaveBeenCalledWith(latestCheck);
    expect(onAddCooldown).toHaveBeenCalledWith(latestCheck);
  });
});
