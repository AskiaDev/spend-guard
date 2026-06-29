import { describe, expect, it } from "vitest";

import {
  formatNextRecurringDueDate,
  formatNextMonthlyDueDate,
  formatShortDate,
  getDaysUntil,
  getMonthlyRecurringAmount,
  getNextMonthlyDueDate,
  getUpcomingRecurringPaymentTotal,
} from "./next-due-date";

describe("next due date helpers", () => {
  it("formats the next monthly due date after a passed due day", () => {
    const reference = new Date(2026, 5, 29);
    const next = getNextMonthlyDueDate(1, reference);

    expect(formatShortDate(next)).toBe("07/01/26");
    expect(getDaysUntil(next, reference)).toBe(2);
    expect(formatNextMonthlyDueDate([1], reference)).toBe("07/01/26");
  });

  it("advances biweekly schedules from their anchor date", () => {
    const reference = new Date(2026, 5, 29);

    expect(
      formatNextRecurringDueDate(
        [{ dueDay: 6, paymentCadence: "biweekly", nextDueDate: "2026-06-06" }],
        reference
      )
    ).toBe("07/04/26");
  });

  it("counts every biweekly payment due inside the next 30 days", () => {
    const reference = new Date(2026, 5, 29);

    expect(
      getUpcomingRecurringPaymentTotal(
        [{ amount: 3_800, dueDay: 6, paymentCadence: "biweekly", nextDueDate: "2026-07-06" }],
        reference
      )
    ).toBe(7_600);
    expect(getMonthlyRecurringAmount(3_800, "biweekly")).toBeCloseTo(8_233.33, 2);
  });

  it("counts semi-monthly payments from two fixed due days", () => {
    const reference = new Date(2026, 5, 29);

    expect(
      formatNextRecurringDueDate(
        [{ dueDay: 1, secondDueDay: 15, paymentCadence: "semi_monthly" }],
        reference
      )
    ).toBe("07/01/26");
    expect(
      getUpcomingRecurringPaymentTotal(
        [{ amount: 1_000, dueDay: 1, secondDueDay: 15, paymentCadence: "semi_monthly" }],
        reference
      )
    ).toBe(2_000);
    expect(getMonthlyRecurringAmount(1_000, "semi_monthly")).toBe(2_000);
  });
});
