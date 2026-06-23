import { describe, expect, it, vi } from "vitest";
import { emptySnapshot } from "@/lib/storage/default-data";
import { loadFinancialWorkspace } from "./load-financial-workspace";

vi.mock("@/lib/supabase/server", () => ({ requireUserId: vi.fn() }));

type QueryResult = { data: unknown; error: { message: string } | null };

function createClient(results: Record<string, QueryResult>) {
  const from = vi.fn((table: string) => {
    const result = results[table] ?? { data: [], error: null };
    const promise = Promise.resolve(result);
    const builder = {
      select: () => builder,
      eq: () => builder,
      order: () => builder,
      maybeSingle: () => promise,
      then: promise.then.bind(promise),
    };

    return builder;
  });

  return { from };
}

describe("loadFinancialWorkspace", () => {
  it("loads an empty remote workspace for a new authenticated user", async () => {
    const client = createClient({
      profiles: { data: null, error: null },
    });

    const result = await loadFinancialWorkspace(client as never, "user-1");

    expect(result).toEqual({
      ok: true,
      data: {
        snapshot: emptySnapshot,
        checks: [],
        cooldownItems: [],
        weeklyReports: [],
      },
    });
    expect(client.from).toHaveBeenCalledWith("profiles");
    expect(client.from).toHaveBeenCalledWith("purchase_checks");
  });

  it("rejects partial workspace data when any query fails", async () => {
    const client = createClient({
      profiles: { data: null, error: null },
      goals: { data: null, error: { message: "database unavailable" } },
    });

    await expect(loadFinancialWorkspace(client as never, "user-1")).resolves.toEqual({
      ok: false,
      error: "Unable to load your financial workspace.",
    });
  });
});
