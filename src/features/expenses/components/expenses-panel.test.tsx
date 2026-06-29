import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { financialSnapshotFixture } from "@/test/fixtures/financial-snapshot";
import type { Expense } from "@/types/finance";
import { ExpensesPanel } from "./expenses-panel";

vi.mock("goey-toast", () => ({ gooeyToast: { success: vi.fn(), error: vi.fn() } }));

import { gooeyToast } from "goey-toast";

const expenses = financialSnapshotFixture.expenses;

function renderExpensesPanel({
  items = expenses,
  onCreateExpense = vi.fn().mockResolvedValue(undefined),
  onUpdateExpense = vi.fn().mockResolvedValue(undefined),
  onDeleteExpense = vi.fn().mockResolvedValue(undefined),
}: {
  items?: Expense[];
  onCreateExpense?: (expense: Omit<Expense, "id">) => Promise<Expense | undefined>;
  onUpdateExpense?: (id: string, expense: Omit<Expense, "id">) => Promise<void>;
  onDeleteExpense?: (id: string) => Promise<void>;
} = {}) {
  return render(
    <ExpensesPanel
      expenses={items}
      currency="PHP"
      onCreateExpense={onCreateExpense}
      onUpdateExpense={onUpdateExpense}
      onDeleteExpense={onDeleteExpense}
      referenceDate={new Date(2026, 5, 29)}
    />
  );
}

describe("ExpensesPanel", () => {
  it("renders expense summary and editable expense cards", () => {
    renderExpensesPanel();

    const summary = screen.getByTestId("expense-summary");
    expect(within(summary).getByText("Tracked expenses")).toBeVisible();
    expect(within(screen.getByLabelText("Tracked expenses metric")).getByText("2")).toBeVisible();
    expect(within(summary).getByText("Monthly total")).toBeVisible();
    expect(within(summary).getByText(/28,500/)).toBeVisible();
    expect(within(summary).getByText("07/01/26")).toBeVisible();

    const rent = screen.getByRole("article", { name: "Rent expense" });
    expect(within(rent).getByText("Rent")).toBeVisible();
    expect(within(rent).getByText("Recurring")).toBeVisible();
    expect(within(rent).getByText(/22,000/)).toBeVisible();
    expect(within(rent).getByText("Monthly · 07/01/26")).toBeVisible();
    expect(within(rent).getByRole("button", { name: "Edit Rent" })).toBeEnabled();
    expect(within(rent).getByRole("button", { name: "Delete Rent" })).toBeEnabled();
  });

  it("creates an expense from the form", async () => {
    const user = userEvent.setup();
    const onCreateExpense = vi.fn().mockResolvedValue(undefined);
    renderExpensesPanel({ onCreateExpense });

    await user.click(screen.getByRole("button", { name: "New Expense" }));
    await user.type(screen.getByLabelText("Expense name"), "Phone plan");
    await user.type(screen.getByLabelText("Amount"), "1200");
    await user.clear(screen.getByLabelText("Due day"));
    await user.type(screen.getByLabelText("Due day"), "10");
    await user.click(screen.getByLabelText("Recurring"));
    await user.click(await screen.findByRole("option", { name: "One-time" }));
    await user.click(screen.getByRole("button", { name: "Create Expense" }));

    expect(onCreateExpense).toHaveBeenCalledWith({
      label: "Phone plan",
      amount: 1200,
      dueDay: 10,
      isRecurring: false,
      paymentCadence: "monthly",
      nextDueDate: undefined,
      secondDueDay: undefined,
    });
  });

  it("creates a biweekly recurring expense from the form", async () => {
    const user = userEvent.setup();
    const onCreateExpense = vi.fn().mockResolvedValue(undefined);
    renderExpensesPanel({ onCreateExpense });

    await user.click(screen.getByRole("button", { name: "New Expense" }));
    await user.type(screen.getByLabelText("Expense name"), "Therapy");
    await user.type(screen.getByLabelText("Amount"), "2000");
    await user.click(screen.getByLabelText("Schedule"));
    await user.click(await screen.findByRole("option", { name: "Every 2 weeks" }));
    await user.click(screen.getByRole("button", { name: "Next due date" }));
    await user.click(within(await screen.findByRole("grid")).getByText("30"));
    await user.click(screen.getByRole("button", { name: "Create Expense" }));

    expect(onCreateExpense).toHaveBeenCalledWith({
      label: "Therapy",
      amount: 2000,
      dueDay: 30,
      isRecurring: true,
      paymentCadence: "biweekly",
      nextDueDate: "2026-06-30",
      secondDueDay: undefined,
    });
  });

  it("creates a semi-monthly recurring expense from the form", async () => {
    const user = userEvent.setup();
    const onCreateExpense = vi.fn().mockResolvedValue(undefined);
    renderExpensesPanel({ onCreateExpense });

    await user.click(screen.getByRole("button", { name: "New Expense" }));
    await user.type(screen.getByLabelText("Expense name"), "Rent split");
    await user.type(screen.getByLabelText("Amount"), "14000");
    await user.click(screen.getByLabelText("Schedule"));
    await user.click(await screen.findByRole("option", { name: "Twice a month" }));
    await user.clear(screen.getByLabelText("First due day"));
    await user.type(screen.getByLabelText("First due day"), "1");
    await user.clear(screen.getByLabelText("Second due day"));
    await user.type(screen.getByLabelText("Second due day"), "15");
    await user.click(screen.getByRole("button", { name: "Create Expense" }));

    expect(onCreateExpense).toHaveBeenCalledWith({
      label: "Rent split",
      amount: 14000,
      dueDay: 1,
      isRecurring: true,
      paymentCadence: "semi_monthly",
      nextDueDate: undefined,
      secondDueDay: 15,
    });
  });

  it("updates an existing expense", async () => {
    const user = userEvent.setup();
    const onUpdateExpense = vi.fn().mockResolvedValue(undefined);
    renderExpensesPanel({ onUpdateExpense });

    await user.click(screen.getByRole("button", { name: "Edit Utilities and internet" }));
    await user.clear(screen.getByLabelText("Amount"));
    await user.type(screen.getByLabelText("Amount"), "7000");
    await user.click(screen.getByRole("button", { name: "Save Expense" }));

    expect(onUpdateExpense).toHaveBeenCalledWith("expense_utilities", {
      label: "Utilities and internet",
      amount: 7000,
      dueDay: 15,
      isRecurring: true,
      paymentCadence: "monthly",
      nextDueDate: undefined,
      secondDueDay: undefined,
    });
  });

  it("deletes an expense through its card action", async () => {
    const user = userEvent.setup();
    const onDeleteExpense = vi.fn().mockResolvedValue(undefined);
    renderExpensesPanel({ onDeleteExpense });

    await user.click(screen.getByRole("button", { name: "Delete Rent" }));
    await user.click(screen.getByRole("button", { name: "Remove" }));

    expect(onDeleteExpense).toHaveBeenCalledWith("expense_rent");
    expect(gooeyToast.success).toHaveBeenCalledWith("Expense removed");
  });

  it("blocks invalid expense input with accessible errors", async () => {
    const user = userEvent.setup();
    const onCreateExpense = vi.fn().mockResolvedValue(undefined);
    renderExpensesPanel({ onCreateExpense });

    await user.click(screen.getByRole("button", { name: "New Expense" }));
    await user.clear(screen.getByLabelText("Due day"));
    await user.type(screen.getByLabelText("Due day"), "32");
    await user.click(screen.getByRole("button", { name: "Create Expense" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Name this expense.");
    expect(alert).toHaveTextContent("Enter a positive amount.");
    expect(alert).toHaveTextContent("Use a due day from 1 to 31.");
    expect(onCreateExpense).not.toHaveBeenCalled();
  });
});
