import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDebtAction, deleteDebtAction, updateDebtAction } from "./manage-debt";

vi.mock("@/lib/supabase/server", () => ({ requireUserId: vi.fn() }));

import { requireUserId } from "@/lib/supabase/server";

const mockedRequireUserId = vi.mocked(requireUserId);

describe("debt actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts a validated debt for the authenticated user", async () => {
    const insert = vi.fn(async () => ({ error: null }));
    const supabase = { from: vi.fn(() => ({ insert })) };
    mockedRequireUserId.mockResolvedValueOnce({ supabase, userId: "user-1" } as never);

    const result = await createDebtAction({
      label: "Credit card",
      outstandingBalance: 35_000,
      minimumPayment: 5_000,
      dueDay: 20,
      interestRate: 0.32,
    });

    expect(result).toEqual({ ok: true, data: null });
    expect(supabase.from).toHaveBeenCalledWith("debts");
    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      label: "Credit card",
      outstanding_balance: 35_000,
      minimum_payment: 5_000,
      due_day: 20,
      interest_rate: 0.32,
    });
  });

  it("persists blank interest as null", async () => {
    const insert = vi.fn(async () => ({ error: null }));
    const supabase = { from: vi.fn(() => ({ insert })) };
    mockedRequireUserId.mockResolvedValueOnce({ supabase, userId: "user-1" } as never);

    await createDebtAction({
      label: "Device loan",
      outstandingBalance: 12_000,
      minimumPayment: 2_000,
      dueDay: 5,
    });

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ interest_rate: null }));
  });

  it("updates debts only for the authenticated user", async () => {
    const eqUser = vi.fn(async () => ({ error: null }));
    const eqId = vi.fn(() => ({ eq: eqUser }));
    const update = vi.fn(() => ({ eq: eqId }));
    const supabase = { from: vi.fn(() => ({ update })) };
    mockedRequireUserId.mockResolvedValueOnce({ supabase, userId: "user-1" } as never);

    const result = await updateDebtAction("debt-1", {
      label: "Card",
      outstandingBalance: 30_000,
      minimumPayment: 4_000,
      dueDay: 18,
      interestRate: 0.25,
    });

    expect(result).toEqual({ ok: true, data: null });
    expect(supabase.from).toHaveBeenCalledWith("debts");
    expect(update).toHaveBeenCalledWith({
      label: "Card",
      outstanding_balance: 30_000,
      minimum_payment: 4_000,
      due_day: 18,
      interest_rate: 0.25,
    });
    expect(eqId).toHaveBeenCalledWith("id", "debt-1");
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("rejects invalid debt payloads before auth or database access", async () => {
    const result = await createDebtAction({
      label: "",
      outstandingBalance: -1,
      minimumPayment: -1,
      dueDay: 0,
      interestRate: 2,
    });

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({
      error: "Check the debt fields.",
      fieldErrors: {
        label: ["Name this debt."],
        outstandingBalance: ["Enter a positive amount."],
        minimumPayment: ["Enter a positive amount."],
        dueDay: ["Too small: expected number to be >=1"],
        interestRate: ["Too big: expected number to be <=1"],
      },
    });
    expect(mockedRequireUserId).not.toHaveBeenCalled();
  });

  it("requires a debt id before update or delete", async () => {
    await expect(
      updateDebtAction("", { label: "Card", outstandingBalance: 1, minimumPayment: 1, dueDay: 1 })
    ).resolves.toEqual({ ok: false, error: "Debt ID is required." });
    await expect(deleteDebtAction("")).resolves.toEqual({
      ok: false,
      error: "Debt ID is required.",
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
      createDebtAction({
        label: "Card",
        outstandingBalance: 10_000,
        minimumPayment: 1_000,
        dueDay: 1,
      })
    ).resolves.toEqual({ ok: false, error: "Unable to create this debt." });
    await expect(
      updateDebtAction("debt-1", {
        label: "Card",
        outstandingBalance: 10_000,
        minimumPayment: 1_000,
        dueDay: 1,
      })
    ).resolves.toEqual({ ok: false, error: "Unable to update this debt." });
    await expect(deleteDebtAction("debt-1")).resolves.toEqual({
      ok: false,
      error: "Unable to delete this debt.",
    });
  });

  it("deletes debts only for the authenticated user", async () => {
    const eqUser = vi.fn(async () => ({ error: null }));
    const eqId = vi.fn(() => ({ eq: eqUser }));
    const remove = vi.fn(() => ({ eq: eqId }));
    const supabase = { from: vi.fn(() => ({ delete: remove })) };
    mockedRequireUserId.mockResolvedValueOnce({ supabase, userId: "user-1" } as never);

    const result = await deleteDebtAction("debt-1");

    expect(result).toEqual({ ok: true, data: null });
    expect(supabase.from).toHaveBeenCalledWith("debts");
    expect(eqId).toHaveBeenCalledWith("id", "debt-1");
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
  });
});
