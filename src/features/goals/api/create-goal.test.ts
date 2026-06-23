import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGoalAction, deleteGoalAction } from "./create-goal";

vi.mock("@/lib/supabase/server", () => ({ requireUserId: vi.fn() }));

import { requireUserId } from "@/lib/supabase/server";

const mockedRequireUserId = vi.mocked(requireUserId);

describe("goal actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts a validated goal for the authenticated user", async () => {
    const insert = vi.fn(async () => ({ error: null }));
    const supabase = { from: vi.fn(() => ({ insert })) };
    mockedRequireUserId.mockResolvedValueOnce({ supabase, userId: "user-1" } as never);

    const result = await createGoalAction({
      label: "Camera upgrade",
      targetAmount: 60_000,
      savedAmount: 10_000,
      monthlyContribution: 8_000,
      targetDate: "2026-12-15",
      priority: "high",
    });

    expect(result).toEqual({ ok: true, data: null });
    expect(supabase.from).toHaveBeenCalledWith("goals");
    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      label: "Camera upgrade",
      target_amount: 60_000,
      saved_amount: 10_000,
      monthly_contribution: 8_000,
      target_date: "2026-12-15",
      priority: "high",
    });
  });

  it("rejects invalid goal payloads before auth or database access", async () => {
    const result = await createGoalAction({
      label: "",
      targetAmount: 0,
      savedAmount: 0,
      monthlyContribution: 0,
      targetDate: "not-a-date",
      priority: "medium",
    });

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({
      error: "Check the goal fields.",
      fieldErrors: {
        label: ["Name this goal."],
        targetAmount: ["Enter a target amount above zero."],
        monthlyContribution: ["Enter a monthly contribution above zero."],
        targetDate: ["Enter a valid target date."],
      },
    });
    expect(mockedRequireUserId).not.toHaveBeenCalled();
  });

  it("returns a friendly error when insertion fails", async () => {
    const insert = vi.fn(async () => ({ error: { message: "insert failed" } }));
    const supabase = { from: vi.fn(() => ({ insert })) };
    mockedRequireUserId.mockResolvedValueOnce({ supabase, userId: "user-1" } as never);

    const result = await createGoalAction({
      label: "Camera upgrade",
      targetAmount: 60_000,
      savedAmount: 10_000,
      monthlyContribution: 8_000,
      priority: "high",
    });

    expect(result).toEqual({ ok: false, error: "Unable to create this goal." });
  });

  it("deletes goals only for the authenticated user", async () => {
    const eqUser = vi.fn(async () => ({ error: null }));
    const eqId = vi.fn(() => ({ eq: eqUser }));
    const remove = vi.fn(() => ({ eq: eqId }));
    const supabase = { from: vi.fn(() => ({ delete: remove })) };
    mockedRequireUserId.mockResolvedValueOnce({ supabase, userId: "user-1" } as never);

    const result = await deleteGoalAction("goal-1");

    expect(result).toEqual({ ok: true, data: null });
    expect(supabase.from).toHaveBeenCalledWith("goals");
    expect(remove).toHaveBeenCalled();
    expect(eqId).toHaveBeenCalledWith("id", "goal-1");
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
  });
});
