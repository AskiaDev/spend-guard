import { describe, expect, it } from "vitest";

import type { Debt } from "@/types/finance";

import { getUpcomingDebts, getUpcomingDebtTotal } from "./upcoming-debt";

function debt(overrides: Partial<Debt> = {}): Debt {
  return {
    id: "debt_1",
    label: "Credit card",
    outstandingBalance: 50000,
    minimumPayment: 2500,
    dueDay: 15,
    ...overrides,
  };
}

describe("getUpcomingDebts", () => {
  it("returns a debt whose due day is later this month with its next date and days remaining", () => {
    const reference = new Date(2026, 6, 5); // 2026-07-05 (local)

    const result = getUpcomingDebts([debt({ dueDay: 20 })], reference);

    expect(result).toHaveLength(1);
    expect(result[0].nextDueDate).toBe("2026-07-20");
    expect(result[0].daysUntilDue).toBe(15);
  });

  it("rolls over to next month when the due day has already passed this month", () => {
    const reference = new Date(2026, 6, 15); // 2026-07-15

    const [upcoming] = getUpcomingDebts([debt({ dueDay: 10 })], reference);

    expect(upcoming.nextDueDate).toBe("2026-08-10");
    expect(upcoming.daysUntilDue).toBe(26);
  });

  it("treats a debt due today as zero days remaining and includes it", () => {
    const reference = new Date(2026, 6, 20); // 2026-07-20

    const [upcoming] = getUpcomingDebts([debt({ dueDay: 20 })], reference);

    expect(upcoming.daysUntilDue).toBe(0);
    expect(upcoming.nextDueDate).toBe("2026-07-20");
  });

  it("clamps a day-31 due date to the last day of a short month", () => {
    const reference = new Date(2026, 1, 10); // 2026-02-10, Feb 2026 has 28 days

    const [upcoming] = getUpcomingDebts([debt({ dueDay: 31 })], reference);

    expect(upcoming.nextDueDate).toBe("2026-02-28");
    expect(upcoming.daysUntilDue).toBe(18);
  });

  it("includes a debt due exactly 30 days out (window boundary)", () => {
    const reference = new Date(2026, 6, 1); // 2026-07-01

    const result = getUpcomingDebts([debt({ dueDay: 31 })], reference); // 2026-07-31

    expect(result).toHaveLength(1);
    expect(result[0].daysUntilDue).toBe(30);
  });

  it("sorts results ascending by days until due", () => {
    const reference = new Date(2026, 6, 5); // 2026-07-05

    const result = getUpcomingDebts(
      [
        debt({ id: "later", dueDay: 25 }),
        debt({ id: "sooner", dueDay: 18 }),
      ],
      reference
    );

    expect(result.map((item) => item.debt.id)).toEqual(["sooner", "later"]);
  });

  it("breaks ties on the same due day by the larger minimum payment first", () => {
    const reference = new Date(2026, 6, 5); // 2026-07-05

    const result = getUpcomingDebts(
      [
        debt({ id: "small", dueDay: 18, minimumPayment: 1000 }),
        debt({ id: "large", dueDay: 18, minimumPayment: 4000 }),
      ],
      reference
    );

    expect(result.map((item) => item.debt.id)).toEqual(["large", "small"]);
  });

  it("returns an empty array when there are no debts", () => {
    expect(getUpcomingDebts([], new Date(2026, 6, 5))).toEqual([]);
  });

  it("is deterministic for a fixed reference date", () => {
    const reference = new Date(2026, 6, 5);
    const debts = [debt({ dueDay: 20 }), debt({ id: "d2", dueDay: 9 })];

    expect(getUpcomingDebts(debts, reference)).toEqual(getUpcomingDebts(debts, reference));
  });
});

describe("getUpcomingDebtTotal", () => {
  it("sums the minimum payments of debts due within 30 days", () => {
    const reference = new Date(2026, 6, 5);

    const total = getUpcomingDebtTotal(
      [
        debt({ id: "a", dueDay: 10, minimumPayment: 2500 }),
        debt({ id: "b", dueDay: 28, minimumPayment: 1500 }),
      ],
      reference
    );

    expect(total).toBe(4000);
  });

  it("returns zero when there are no debts", () => {
    expect(getUpcomingDebtTotal([], new Date(2026, 6, 5))).toBe(0);
  });
});
