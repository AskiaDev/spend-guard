import { afterEach, describe, expect, it, vi } from "vitest";

import { extractPurchaseWithModel } from "./extract-with-model";

const draft = {
  itemName: "Phone",
  amount: 25_000,
  downPayment: null,
  installmentMonths: null,
  monthlyPayment: null,
  paymentMethod: "cash",
  urgency: "want",
};

afterEach(() => vi.unstubAllGlobals());

describe("extractPurchaseWithModel", () => {
  it("makes no request and returns null when disabled (regex-only setup)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(extractPurchaseWithModel("buy a phone for 25k", { enabled: false })).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a validated draft on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(draft), { status: 200 }))
    );

    await expect(
      extractPurchaseWithModel("buy a phone for 25k", { enabled: true })
    ).resolves.toEqual(draft);
  });

  it("returns null on a non-200 response (falls back to regex)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 503 })));

    await expect(extractPurchaseWithModel("buy a phone", { enabled: true })).resolves.toBeNull();
  });

  it("returns null when the response fails schema validation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ itemName: 123 }), { status: 200 }))
    );

    await expect(extractPurchaseWithModel("buy a phone", { enabled: true })).resolves.toBeNull();
  });

  it("returns null and swallows network errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );

    await expect(extractPurchaseWithModel("buy a phone", { enabled: true })).resolves.toBeNull();
  });
});
