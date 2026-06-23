import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { CooldownItem } from "@/types/finance";
import { CooldownPanel } from "./cooldown-panel";

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

describe("CooldownPanel", () => {
  it("shows horizontally navigable tabs, sorting, and labelled example cards when empty", () => {
    render(<CooldownPanel items={[]} currency="PHP" onRemove={vi.fn()} />);

    const tablist = screen.getByRole("tablist", { name: "Cooldown views" });
    expect(tablist).toHaveClass("overflow-x-auto");

    const tabs = within(tablist).getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual(["All", "Waiting", "Wishlist"]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[0]).toHaveAttribute("tabIndex", "0");
    expect(tabs[1]).toHaveAttribute("tabIndex", "-1");

    expect(screen.getByLabelText("Sort cooldown items")).toHaveValue("recheck");

    const examples = screen.getByRole("region", { name: "Example items" });
    expect(within(examples).getByText("Example items")).toBeVisible();
    expect(
      within(examples).getByText("Grocery restock from a supermarket")
    ).toBeVisible();
    expect(
      within(examples).getByText("Replacement tech from an electronics store")
    ).toBeVisible();
    expect(within(examples).getAllByRole("article")).toHaveLength(2);
  });

  it("renders live cooldown items with status, risk, actions, and labelled controls", () => {
    render(<CooldownPanel items={cooldownItems} currency="PHP" onRemove={vi.fn()} />);

    const laptop = screen.getByRole("article", { name: "Laptop cooldown item" });
    expect(within(laptop).getByText("Laptop")).toBeVisible();
    expect(within(laptop).getByText("₱45,000")).toBeVisible();
    expect(within(laptop).getByText("Wait")).toBeVisible();
    expect(within(laptop).getByText("Risk: Can wait")).toBeVisible();
    expect(within(laptop).getByText("Cooldown: recheck Jun 27, 2026")).toBeVisible();
    expect(within(laptop).getByRole("button", { name: "Recheck Laptop" })).toBeDisabled();
    expect(within(laptop).getByRole("button", { name: "Convert Laptop to Goal" })).toBeDisabled();
    expect(within(laptop).getByRole("button", { name: "More actions for Laptop" })).toBeDisabled();
    expect(within(laptop).getByRole("button", { name: "Remove Laptop" })).toBeVisible();
    expect(within(laptop).getByText(/recheck and goal conversion are coming soon/i)).toBeVisible();

    const espresso = screen.getByRole("article", { name: "Espresso machine cooldown item" });
    expect(within(espresso).getByText("Espresso machine")).toBeVisible();
    expect(within(espresso).getByText("Risk: Want")).toBeVisible();
    expect(within(espresso).getByText("Cooldown: recheck Jul 5, 2026")).toBeVisible();
  });

  it("updates tab selection and filters wishlist items without losing sort controls", async () => {
    const user = userEvent.setup();

    render(<CooldownPanel items={cooldownItems} currency="PHP" onRemove={vi.fn()} />);

    const wishlistTab = screen.getByRole("tab", { name: "Wishlist" });
    await user.click(wishlistTab);

    expect(wishlistTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("article", { name: "Espresso machine cooldown item" })).toBeVisible();
    expect(
      screen.queryByRole("article", { name: "Laptop cooldown item" })
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Sort cooldown items")).toHaveValue("recheck");
  });

  it("links tabs to a tabpanel and supports arrow-key navigation", async () => {
    const user = userEvent.setup();

    render(<CooldownPanel items={cooldownItems} currency="PHP" onRemove={vi.fn()} />);

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
    render(<CooldownPanel items={cooldownItems} currency="PHP" onRemove={vi.fn()} />);

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
      render(
        <CooldownPanel
          items={[
            {
              ...cooldownItems[0],
              recheckAt: "2026-06-27T00:00:00.000Z",
            },
          ]}
          currency="PHP"
          onRemove={vi.fn()}
        />
      );

      const laptop = screen.getByRole("article", { name: "Laptop cooldown item" });

      expect(within(laptop).getByText("Cooldown: recheck Jun 27, 2026")).toBeVisible();
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

    render(<CooldownPanel items={cooldownItems} currency="PHP" onRemove={onRemove} />);

    await user.click(screen.getByRole("button", { name: "Remove Laptop" }));

    expect(onRemove).toHaveBeenCalledOnce();
    expect(onRemove).toHaveBeenCalledWith("cooldown_laptop");
  });
});
