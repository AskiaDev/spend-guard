import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteLedgerTransactionAction,
  listLedgerTransactionsAction,
  updateLedgerTransactionAction,
} from "./manage-transactions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ requireUserId: vi.fn() }));

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/supabase/server";

const mockedRequireUserId = vi.mocked(requireUserId);
const mockedRevalidatePath = vi.mocked(revalidatePath);

describe("ledger transaction actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads confirmed transactions with server-side page ranges", async () => {
    const range = vi.fn(async () => ({
      data: [
        {
          id: "tx-1",
          user_id: "user-1",
          amount: 250,
          label: "Coffee",
          created_at: "2026-06-29T00:00:00.000Z",
          occurred_at: "2026-06-28",
          direction: "expense",
          category: "food",
          counterparty: "Coffee Shop",
          source: "image",
          source_ref: "receipt.png",
          confidence: 0.91,
          status: "confirmed",
          raw_extract: null,
        },
      ],
      count: 21,
      error: null,
    }));
    const orderCreated = vi.fn(() => ({ range }));
    const orderOccurred = vi.fn(() => ({ order: orderCreated }));
    const eqStatus = vi.fn(() => ({ order: orderOccurred }));
    const eqUser = vi.fn(() => ({ eq: eqStatus }));
    const select = vi.fn(() => ({ eq: eqUser }));
    const supabase = { from: vi.fn(() => ({ select })) };
    mockedRequireUserId.mockResolvedValueOnce({ supabase, userId: "user-1" } as never);

    const result = await listLedgerTransactionsAction({ page: 2 });

    expect(result).toMatchObject({
      ok: true,
      data: {
        transactions: [
          {
            id: "tx-1",
            amount: 250,
            occurredAt: "2026-06-28",
            direction: "expense",
            category: "food",
          },
        ],
        pagination: { page: 2, pageSize: 10, total: 21, pageCount: 3 },
      },
    });
    expect(supabase.from).toHaveBeenCalledWith("transactions");
    expect(select).toHaveBeenCalledWith(expect.any(String), { count: "exact" });
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqStatus).toHaveBeenCalledWith("status", "confirmed");
    expect(range).toHaveBeenCalledWith(10, 19);
  });

  it("updates confirmed transactions only for the authenticated user", async () => {
    const eqStatus = vi.fn(async () => ({ error: null }));
    const eqUser = vi.fn(() => ({ eq: eqStatus }));
    const eqId = vi.fn(() => ({ eq: eqUser }));
    const update = vi.fn(() => ({ eq: eqId }));
    const supabase = { from: vi.fn(() => ({ update })) };
    mockedRequireUserId.mockResolvedValueOnce({ supabase, userId: "user-1" } as never);

    const result = await updateLedgerTransactionAction("tx-1", {
      occurredAt: "2026-06-29",
      direction: "income",
      amount: 1000,
      counterparty: "  Client  ",
      category: "income_other",
    });

    expect(result).toEqual({ ok: true, data: null });
    expect(supabase.from).toHaveBeenCalledWith("transactions");
    expect(update).toHaveBeenCalledWith({
      amount: 1000,
      label: "Client",
      occurred_at: "2026-06-29",
      direction: "income",
      category: "income_other",
      counterparty: "Client",
    });
    expect(eqId).toHaveBeenCalledWith("id", "tx-1");
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqStatus).toHaveBeenCalledWith("status", "confirmed");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/import");
  });

  it("deletes confirmed transactions only for the authenticated user", async () => {
    const eqStatus = vi.fn(async () => ({ error: null }));
    const eqUser = vi.fn(() => ({ eq: eqStatus }));
    const eqId = vi.fn(() => ({ eq: eqUser }));
    const remove = vi.fn(() => ({ eq: eqId }));
    const supabase = { from: vi.fn(() => ({ delete: remove })) };
    mockedRequireUserId.mockResolvedValueOnce({ supabase, userId: "user-1" } as never);

    const result = await deleteLedgerTransactionAction("tx-1");

    expect(result).toEqual({ ok: true, data: null });
    expect(supabase.from).toHaveBeenCalledWith("transactions");
    expect(eqId).toHaveBeenCalledWith("id", "tx-1");
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqStatus).toHaveBeenCalledWith("status", "confirmed");
  });

  it("rejects invalid updates before auth or database access", async () => {
    const result = await updateLedgerTransactionAction("tx-1", {
      occurredAt: "",
      direction: "other",
      amount: 0,
      counterparty: "",
      category: "food",
    });

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ error: "Check the transaction fields." });
    expect(mockedRequireUserId).not.toHaveBeenCalled();
  });

  it("requires transaction ids before update or delete", async () => {
    await expect(updateLedgerTransactionAction("", {})).resolves.toEqual({
      ok: false,
      error: "Transaction ID is required.",
    });
    await expect(deleteLedgerTransactionAction("")).resolves.toEqual({
      ok: false,
      error: "Transaction ID is required.",
    });
    expect(mockedRequireUserId).not.toHaveBeenCalled();
  });
});
