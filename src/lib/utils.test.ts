import { describe, expect, it, vi } from "vitest";
import { createId, formatCurrency, formatPercent, toIsoDate } from "./utils";

describe("utils", () => {
  it("formats currencies and percentages", () => {
    expect(formatCurrency(25000, "PHP")).toBe("₱25,000");
    expect(formatPercent(0.42)).toBe("42%");
  });

  it("creates ids with crypto when available", () => {
    const randomUUID = vi.spyOn(crypto, "randomUUID").mockReturnValue("abc" as `${string}-${string}-${string}-${string}-${string}`);

    expect(createId("goal")).toBe("goal_abc");
    randomUUID.mockRestore();
  });

  it("formats dates as ISO calendar dates", () => {
    expect(toIsoDate(new Date("2026-06-20T12:00:00.000Z"))).toBe("2026-06-20");
  });
});
