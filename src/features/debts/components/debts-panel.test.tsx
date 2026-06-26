import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { financialSnapshotFixture } from "@/test/fixtures/financial-snapshot";
import type { Debt } from "@/types/finance";
import { DebtsPanel } from "./debts-panel";

vi.mock("goey-toast", () => ({ gooeyToast: { success: vi.fn(), error: vi.fn() } }));

import { gooeyToast } from "goey-toast";

const debts = financialSnapshotFixture.debts;

function renderDebtsPanel({
  items = debts,
  onCreateDebt = vi.fn().mockResolvedValue(undefined),
  onUpdateDebt = vi.fn().mockResolvedValue(undefined),
  onDeleteDebt = vi.fn().mockResolvedValue(undefined),
}: {
  items?: Debt[];
  onCreateDebt?: (debt: Omit<Debt, "id">) => Promise<Debt | undefined>;
  onUpdateDebt?: (id: string, debt: Omit<Debt, "id">) => Promise<void>;
  onDeleteDebt?: (id: string) => Promise<void>;
} = {}) {
  return render(
    <DebtsPanel
      debts={items}
      currency="PHP"
      onCreateDebt={onCreateDebt}
      onUpdateDebt={onUpdateDebt}
      onDeleteDebt={onDeleteDebt}
    />
  );
}

describe("DebtsPanel", () => {
  it("renders debt summary and editable debt cards", () => {
    renderDebtsPanel();

    const summary = screen.getByTestId("debt-summary");
    expect(within(summary).getByText("Tracked debts")).toBeVisible();
    expect(within(summary).getByText("1")).toBeVisible();
    expect(within(summary).getByText("Total balance")).toBeVisible();
    expect(within(summary).getByText(/35,000/)).toBeVisible();
    expect(within(summary).getByText("Day 20")).toBeVisible();

    const card = screen.getByRole("article", { name: "Credit card debt" });
    expect(within(card).getByText("Credit card")).toBeVisible();
    expect(within(card).getByText("32% APR")).toBeVisible();
    expect(within(card).getByText(/35,000/)).toBeVisible();
    expect(within(card).getByText("Day 20")).toBeVisible();
    expect(within(card).getByRole("button", { name: "Edit Credit card" })).toBeEnabled();
    expect(within(card).getByRole("button", { name: "Delete Credit card" })).toBeEnabled();
  });

  it("creates a debt from the form", async () => {
    const user = userEvent.setup();
    const onCreateDebt = vi.fn().mockResolvedValue(undefined);
    renderDebtsPanel({ onCreateDebt });

    await user.click(screen.getByRole("button", { name: "New Debt" }));
    await user.type(screen.getByLabelText("Debt name"), "Device loan");
    await user.type(screen.getByLabelText("Balance"), "12000");
    await user.type(screen.getByLabelText("Minimum payment"), "2000");
    await user.clear(screen.getByLabelText("Due day"));
    await user.type(screen.getByLabelText("Due day"), "5");
    await user.type(screen.getByLabelText("Interest rate"), "0.18");
    await user.click(screen.getByRole("button", { name: "Create Debt" }));

    expect(onCreateDebt).toHaveBeenCalledWith({
      label: "Device loan",
      outstandingBalance: 12000,
      minimumPayment: 2000,
      dueDay: 5,
      interestRate: 0.18,
    });
  });

  it("updates an existing debt and allows blank optional interest", async () => {
    const user = userEvent.setup();
    const onUpdateDebt = vi.fn().mockResolvedValue(undefined);
    renderDebtsPanel({ onUpdateDebt });

    await user.click(screen.getByRole("button", { name: "Edit Credit card" }));
    await user.clear(screen.getByLabelText("Balance"));
    await user.type(screen.getByLabelText("Balance"), "30000");
    await user.clear(screen.getByLabelText("Interest rate"));
    await user.click(screen.getByRole("button", { name: "Save Debt" }));

    expect(onUpdateDebt).toHaveBeenCalledWith("debt_card", {
      label: "Credit card",
      outstandingBalance: 30000,
      minimumPayment: 5000,
      dueDay: 20,
      interestRate: undefined,
    });
  });

  it("deletes a debt through its card action", async () => {
    const user = userEvent.setup();
    const onDeleteDebt = vi.fn().mockResolvedValue(undefined);
    renderDebtsPanel({ onDeleteDebt });

    await user.click(screen.getByRole("button", { name: "Delete Credit card" }));
    await user.click(screen.getByRole("button", { name: "Remove" }));

    expect(onDeleteDebt).toHaveBeenCalledWith("debt_card");
    expect(gooeyToast.success).toHaveBeenCalledWith("Debt removed");
  });

  it("blocks invalid debt input with accessible errors", async () => {
    const user = userEvent.setup();
    const onCreateDebt = vi.fn().mockResolvedValue(undefined);
    renderDebtsPanel({ onCreateDebt });

    await user.click(screen.getByRole("button", { name: "New Debt" }));
    await user.clear(screen.getByLabelText("Due day"));
    await user.type(screen.getByLabelText("Due day"), "0");
    await user.type(screen.getByLabelText("Interest rate"), "2");
    await user.click(screen.getByRole("button", { name: "Create Debt" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Name this debt.");
    expect(alert).toHaveTextContent("Enter a positive balance.");
    expect(alert).toHaveTextContent("Enter a positive minimum payment.");
    expect(alert).toHaveTextContent("Use a due day from 1 to 31.");
    expect(alert).toHaveTextContent("Use a decimal rate from 0 to 1.");
    expect(onCreateDebt).not.toHaveBeenCalled();
  });
});
