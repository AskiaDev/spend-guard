import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("goey-toast", () => ({ gooeyToast: { success: vi.fn(), error: vi.fn() } }));

import { gooeyToast } from "goey-toast";

import type { CooldownItem, FinancialSnapshot } from "@/types/finance";
import { CooldownPanel } from "./cooldown-panel";

// Strong finances with no debt: a recheck of any reasonable item lands SAFE_TO_BUY.
const snapshot: FinancialSnapshot = {
  profile: {
    currency: "PHP",
    monthlyIncome: 90_000,
    currentSavings: 200_000,
    emergencyFundTarget: 100_000,
    emergencyBuffer: 20_000,
    cooldownPreference: "balanced",
    estimatedVariableExpenses: 10_000,
  },
  expenses: [{ id: "rent", label: "Rent", amount: 20_000, dueDay: 1, isRecurring: true }],
  debts: [],
  goals: [],
};

const cooldownItems: CooldownItem[] = [
  {
    id: "cooldown_laptop",
    itemName: "Laptop",
    amount: 45000,
    urgency: "can_wait",
    paymentMethod: "credit_card",
    addedAt: "2026-06-20T00:00:00.000Z",
    recheckAt: "2026-06-27",
    sourceCheckId: "check_laptop",
  },
  {
    id: "cooldown_espresso",
    itemName: "Espresso machine",
    amount: 32000,
    urgency: "want",
    paymentMethod: "cash",
    addedAt: "2026-06-21T00:00:00.000Z",
    recheckAt: "2026-07-05",
  },
];

// Carries a stored baseline so the badge shows the real decision (WAIT) rather than the
// need_now heuristic (Buy with Caution), and a recheck against `snapshot` reads as improved.
const phoneItem: CooldownItem = {
  id: "cooldown_phone",
  itemName: "Phone",
  amount: 5_000,
  urgency: "need_now",
  paymentMethod: "cash",
  addedAt: "2026-06-20T00:00:00.000Z",
  recheckAt: "2026-06-23",
  sourceCheckId: "check_phone",
  baselineDecision: "WAIT",
  baselineRiskScore: 60,
  baselineSafeToSpend: 40_000,
};

function renderPanel(
  items: CooldownItem[],
  overrides: {
    onRemove?: (id: string) => Promise<void>;
    onConvertToGoal?: (item: CooldownItem) => Promise<unknown> | unknown;
  } = {}
) {
  const onRemove = overrides.onRemove ?? (vi.fn(async () => {}) as (id: string) => Promise<void>);
  const onConvertToGoal =
    overrides.onConvertToGoal ??
    (vi.fn(async () => {}) as (item: CooldownItem) => Promise<unknown> | unknown);

  render(
    <CooldownPanel
      items={items}
      currency="PHP"
      snapshot={snapshot}
      onRemove={onRemove}
      onConvertToGoal={onConvertToGoal}
    />
  );

  return { onRemove, onConvertToGoal };
}

describe("CooldownPanel", () => {
  it("shows horizontally navigable tabs, sorting, and labelled example cards when empty", () => {
    renderPanel([]);

    const tablist = screen.getByRole("tablist", { name: "Cooldown views" });

    const tabs = within(tablist).getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual(["All", "Waiting", "Wishlist"]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    // Radix roving tabindex: the tablist container is the tab-order entry (tabIndex=0);
    // individual triggers all start at -1 and are navigated via arrow keys.
    // The arrow-key test below verifies that after navigation the focused tab gets tabIndex=0.
    expect(tablist).toHaveAttribute("tabIndex", "0");
    expect(tabs[0]).toHaveAttribute("tabIndex", "-1");
    expect(tabs[1]).toHaveAttribute("tabIndex", "-1");

    // Radix Select trigger shows selected option text, not a form value
    expect(screen.getByLabelText("Sort")).toHaveTextContent("Recheck date");

    const examples = screen.getByRole("region", { name: "Example items" });
    expect(within(examples).getByText("Example items")).toBeVisible();
    expect(within(examples).getByText("Grocery restock from a supermarket")).toBeVisible();
    expect(
      within(examples).getByText("Replacement tech from an electronics store")
    ).toBeVisible();
    expect(within(examples).getAllByRole("article")).toHaveLength(2);
  });

  it("renders live cooldown items with the price-tier hold and active actions", () => {
    renderPanel(cooldownItems);

    const laptop = screen.getByRole("article", { name: "Laptop cooldown item" });
    expect(within(laptop).getByText("Laptop")).toBeVisible();
    expect(within(laptop).getByText("₱45,000")).toBeVisible();
    expect(within(laptop).getByText("Wait")).toBeVisible();
    expect(within(laptop).getByText("Risk: Can wait")).toBeVisible();
    expect(within(laptop).getByText(/7-day hold .* recheck Jun 27, 2026/)).toBeVisible();
    expect(within(laptop).getByRole("button", { name: "Recheck Laptop" })).toBeEnabled();
    expect(within(laptop).getByRole("button", { name: "Convert Laptop to Goal" })).toBeEnabled();
    expect(within(laptop).getByRole("button", { name: "More actions for Laptop" })).toBeDisabled();
    expect(within(laptop).getByRole("button", { name: "Remove Laptop" })).toBeVisible();
    expect(within(laptop).queryByText(/coming soon/i)).not.toBeInTheDocument();

    const espresso = screen.getByRole("article", { name: "Espresso machine cooldown item" });
    expect(within(espresso).getByText("Risk: Want")).toBeVisible();
    expect(within(espresso).getByText(/7-day hold .* recheck Jul 5, 2026/)).toBeVisible();
  });

  it("shows the stored decision on the badge instead of the urgency heuristic", () => {
    renderPanel([phoneItem]);

    const phone = screen.getByRole("article", { name: "Phone cooldown item" });
    // need_now would map to "Buy with Caution" via the heuristic; the stored baseline is "Wait".
    expect(within(phone).getByText("Wait")).toBeVisible();
    expect(within(phone).queryByText("Buy with Caution")).not.toBeInTheDocument();
  });

  it("rechecks against the fresh snapshot and reports an improved decision since added", async () => {
    const user = userEvent.setup();
    renderPanel([phoneItem]);

    const phone = screen.getByRole("article", { name: "Phone cooldown item" });
    await user.click(within(phone).getByRole("button", { name: "Recheck Phone" }));

    const result = within(phone).getByRole("status", { name: "Recheck result for Phone" });
    expect(result).toHaveTextContent("Looking better");
    expect(result).toHaveTextContent("Safe to Buy");
    expect(result).toHaveTextContent(/up ₱/);
    expect(result).toHaveTextContent("since you added this");
  });

  it("rechecks legacy items without a baseline and says there is nothing to compare", async () => {
    const user = userEvent.setup();
    renderPanel([cooldownItems[0]]);

    const laptop = screen.getByRole("article", { name: "Laptop cooldown item" });
    await user.click(within(laptop).getByRole("button", { name: "Recheck Laptop" }));

    const result = within(laptop).getByRole("status", { name: "Recheck result for Laptop" });
    expect(result).toHaveTextContent("Today's check");
    expect(result).toHaveTextContent("No saved result from when you added this");
  });

  it("converts a cooldown item into a goal and confirms it", async () => {
    const user = userEvent.setup();
    const onConvertToGoal = vi.fn().mockResolvedValue(undefined);
    renderPanel([phoneItem], { onConvertToGoal });

    const phone = screen.getByRole("article", { name: "Phone cooldown item" });
    const convert = within(phone).getByRole("button", { name: "Convert Phone to Goal" });
    await user.click(convert);

    expect(onConvertToGoal).toHaveBeenCalledOnce();
    expect(onConvertToGoal).toHaveBeenCalledWith(phoneItem);
    expect(within(phone).getByText(/added to your goals/i)).toBeVisible();
    expect(convert).toBeDisabled();
    expect(gooeyToast.success).toHaveBeenCalledWith("Phone added to goals");
  });

  it("updates tab selection and filters wishlist items without losing sort controls", async () => {
    const user = userEvent.setup();
    renderPanel(cooldownItems);

    const wishlistTab = screen.getByRole("tab", { name: "Wishlist" });
    await user.click(wishlistTab);

    expect(wishlistTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("article", { name: "Espresso machine cooldown item" })).toBeVisible();
    expect(
      screen.queryByRole("article", { name: "Laptop cooldown item" })
    ).not.toBeInTheDocument();
    // Radix Select trigger shows selected option text, not a form value
    expect(screen.getByLabelText("Sort")).toHaveTextContent("Recheck date");
  });

  it("links tabs to a tabpanel and supports arrow-key navigation", async () => {
    const user = userEvent.setup();
    renderPanel(cooldownItems);

    const allTab = screen.getByRole("tab", { name: "All" });
    const waitingTab = screen.getByRole("tab", { name: "Waiting" });
    const wishlistTab = screen.getByRole("tab", { name: "Wishlist" });
    const panel = screen.getByRole("tabpanel");

    expect(allTab).toHaveAttribute("aria-controls", panel.id);
    expect(panel).toHaveAttribute("aria-labelledby", allTab.id);

    allTab.focus();
    await user.keyboard("{ArrowRight}");

    expect(waitingTab).toHaveFocus();
    expect(waitingTab).toHaveAttribute("aria-selected", "true");
    expect(waitingTab).toHaveAttribute("tabIndex", "0");
    expect(allTab).toHaveAttribute("tabIndex", "-1");
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", waitingTab.id);

    await user.keyboard("{End}");

    expect(wishlistTab).toHaveFocus();
    expect(wishlistTab).toHaveAttribute("aria-selected", "true");
  });

  it("keeps every tab aria-controls reference pointed at a rendered panel", () => {
    renderPanel(cooldownItems);

    const controls = screen
      .getAllByRole("tab")
      .map((tab) => tab.getAttribute("aria-controls"));

    expect(controls).toHaveLength(3);
    expect(new Set(controls)).toEqual(new Set(["cooldown-items-panel"]));

    for (const controlId of controls) {
      expect(controlId).toBeTruthy();
      expect(document.getElementById(controlId as string)).toBeInTheDocument();
    }
  });

  it("formats ISO datetime recheck dates by their calendar date component", () => {
    const originalTimeZone = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";

    try {
      renderPanel([{ ...cooldownItems[0], recheckAt: "2026-06-27T00:00:00.000Z" }]);

      const laptop = screen.getByRole("article", { name: "Laptop cooldown item" });

      expect(within(laptop).getByText(/7-day hold .* recheck Jun 27, 2026/)).toBeVisible();
      expect(within(laptop).queryByText(/Jun 26, 2026/)).not.toBeInTheDocument();
    } finally {
      if (originalTimeZone === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = originalTimeZone;
      }
    }
  });

  it("keeps remove controls accessible and calls the remove mutation", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn().mockResolvedValue(undefined);

    renderPanel(cooldownItems, { onRemove });

    await user.click(screen.getByRole("button", { name: "Remove Laptop" }));

    expect(onRemove).toHaveBeenCalledOnce();
    expect(onRemove).toHaveBeenCalledWith("cooldown_laptop");
    expect(gooeyToast.success).toHaveBeenCalledWith("Laptop removed");
  });

  it("reorders items when a different sort option is selected via the Radix Select", async () => {
    const user = userEvent.setup();
    renderPanel(cooldownItems);

    // Default sort is recheck date: Laptop (Jun 27) before Espresso (Jul 5)
    const articlesBefore = screen
      .getAllByRole("article")
      .map((el) => el.getAttribute("aria-label"));
    expect(articlesBefore[0]).toBe("Laptop cooldown item");
    expect(articlesBefore[1]).toBe("Espresso machine cooldown item");

    // Switch to amount low to high: Espresso (32 000) before Laptop (45 000)
    await user.click(screen.getByLabelText("Sort"));
    await user.click(await screen.findByRole("option", { name: "Amount low to high" }));

    const articlesAfter = screen
      .getAllByRole("article")
      .map((el) => el.getAttribute("aria-label"));
    expect(articlesAfter[0]).toBe("Espresso machine cooldown item");
    expect(articlesAfter[1]).toBe("Laptop cooldown item");
  });
});
