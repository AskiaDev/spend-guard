import { beforeEach, describe, expect, it, vi } from "vitest";
import { createExpenseAction, deleteExpenseAction, updateExpenseAction } from "./manage-expense";

vi.mock("@/lib/supabase/server", () => ({ requireUserId: vi.fn() }));

import { requireUserId } from "@/lib/supabase/server";

const mockedRequireUserId = vi.mocked(requireUserId);

describe("expense actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts a validated expense for the authenticated user", async () => {
    const insert = vi.fn(async () => ({ error: null }));
    const supabase = { from: vi.fn(() => ({ insert })) };
    mockedRequireUserId.mockResolvedValueOnce({ supabase, userId: "user-1" } as never);

    const result = await createExpenseAction({
      label: "Rent",
      amount: 28_000,
      dueDay: 1,
      isRecurring: true,
    });

    expect(result).toEqual({ ok: true, data: null });
    expect(supabase.from).toHaveBeenCalledWith("expenses");
    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      label: "Rent",
      amount: 28_000,
      due_day: 1,
      is_recurring: true,
      payment_cadence: "monthly",
      next_due_date: null,
      second_due_day: null,
    });
  });

  it("inserts biweekly recurring expenses with a next due date", async () => {
    const insert = vi.fn(async () => ({ error: null }));
    const supabase = { from: vi.fn(() => ({ insert })) };
    mockedRequireUserId.mockResolvedValueOnce({ supabase, userId: "user-1" } as never);

    const result = await createExpenseAction({
      label: "Therapy",
      amount: 2_000,
      dueDay: 6,
      isRecurring: true,
      paymentCadence: "biweekly",
      nextDueDate: "2026-07-06",
    });

    expect(result).toEqual({ ok: true, data: null });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_cadence: "biweekly",
        next_due_date: "2026-07-06",
        second_due_day: null,
      })
    );
  });

  it("inserts semi-monthly recurring expenses with two due days", async () => {
    const insert = vi.fn(async () => ({ error: null }));
    const supabase = { from: vi.fn(() => ({ insert })) };
    mockedRequireUserId.mockResolvedValueOnce({ supabase, userId: "user-1" } as never);

    const result = await createExpenseAction({
      label: "Rent",
      amount: 14_000,
      dueDay: 1,
      secondDueDay: 15,
      isRecurring: true,
      paymentCadence: "semi_monthly",
    });

    expect(result).toEqual({ ok: true, data: null });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        due_day: 1,
        payment_cadence: "semi_monthly",
        next_due_date: null,
        second_due_day: 15,
      })
    );
  });

  it("updates expenses only for the authenticated user", async () => {
    const eqUser = vi.fn(async () => ({ error: null }));
    const eqId = vi.fn(() => ({ eq: eqUser }));
    const update = vi.fn(() => ({ eq: eqId }));
    const supabase = { from: vi.fn(() => ({ update })) };
    mockedRequireUserId.mockResolvedValueOnce({ supabase, userId: "user-1" } as never);

    const result = await updateExpenseAction("expense-1", {
      label: "Utilities",
      amount: 6_500,
      dueDay: 15,
      isRecurring: false,
    });

    expect(result).toEqual({ ok: true, data: null });
    expect(supabase.from).toHaveBeenCalledWith("expenses");
    expect(update).toHaveBeenCalledWith({
      label: "Utilities",
      amount: 6_500,
      due_day: 15,
      is_recurring: false,
      payment_cadence: "monthly",
      next_due_date: null,
      second_due_day: null,
    });
    expect(eqId).toHaveBeenCalledWith("id", "expense-1");
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("rejects invalid expense payloads before auth or database access", async () => {
    const result = await createExpenseAction({
      label: "",
      amount: -1,
      dueDay: 32,
      isRecurring: true,
    });

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({
      error: "Check the expense fields.",
      fieldErrors: {
        label: ["Name this expense."],
        amount: ["Enter a positive amount."],
        dueDay: ["Too big: expected number to be <=31"],
      },
    });
    expect(mockedRequireUserId).not.toHaveBeenCalled();
  });

  it("requires an expense id before update or delete", async () => {
    await expect(updateExpenseAction("", { label: "Rent", amount: 1, dueDay: 1 })).resolves.toEqual(
      { ok: false, error: "Expense ID is required." }
    );
    await expect(deleteExpenseAction("")).resolves.toEqual({
      ok: false,
      error: "Expense ID is required.",
    });
    expect(mockedRequireUserId).not.toHaveBeenCalled();
  });

  it("returns friendly errors for database failures", async () => {
    const insert = vi.fn(async () => ({ error: { message: "insert failed" } }));
    const updateEqUser = vi.fn(async () => ({ error: { message: "update failed" } }));
    const update = vi.fn(() => ({ eq: () => ({ eq: updateEqUser }) }));
    const deleteEqUser = vi.fn(async () => ({ error: { message: "delete failed" } }));
    const remove = vi.fn(() => ({ eq: () => ({ eq: deleteEqUser }) }));
    const supabase = {
      from: vi.fn(() => ({
        insert,
        update,
        delete: remove,
      })),
    };
    mockedRequireUserId.mockResolvedValue({ supabase, userId: "user-1" } as never);

    await expect(
      createExpenseAction({ label: "Rent", amount: 28_000, dueDay: 1, isRecurring: true })
    ).resolves.toEqual({ ok: false, error: "Unable to create this expense." });
    await expect(
      updateExpenseAction("expense-1", {
        label: "Rent",
        amount: 28_000,
        dueDay: 1,
        isRecurring: true,
      })
    ).resolves.toEqual({ ok: false, error: "Unable to update this expense." });
    await expect(deleteExpenseAction("expense-1")).resolves.toEqual({
      ok: false,
      error: "Unable to delete this expense.",
    });
  });

  it("deletes expenses only for the authenticated user", async () => {
    const eqUser = vi.fn(async () => ({ error: null }));
    const eqId = vi.fn(() => ({ eq: eqUser }));
    const remove = vi.fn(() => ({ eq: eqId }));
    const supabase = { from: vi.fn(() => ({ delete: remove })) };
    mockedRequireUserId.mockResolvedValueOnce({ supabase, userId: "user-1" } as never);

    const result = await deleteExpenseAction("expense-1");

    expect(result).toEqual({ ok: true, data: null });
    expect(supabase.from).toHaveBeenCalledWith("expenses");
    expect(eqId).toHaveBeenCalledWith("id", "expense-1");
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
  });
});
