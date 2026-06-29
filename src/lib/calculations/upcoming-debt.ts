import type { Debt } from "@/types/finance";
import { getDaysUntil, getUpcomingRecurringDates } from "./next-due-date";

/**
 * Number of calendar days, inclusive of today, that defines the "upcoming" window.
 *
 * For monthly-recurring debts the next occurrence of a `dueDay` is always 0–30 days away, so the
 * upper bound is a defensive guard (the exclusion branch is unreachable today); it keeps the helper
 * correct if a non-monthly debt cadence is ever introduced.
 */
export const UPCOMING_DEBT_WINDOW_DAYS = 30;

export interface UpcomingDebt {
  debt: Debt;
  /** Next due date as a local `YYYY-MM-DD` string (safe to render with the existing date helpers). */
  nextDueDate: string;
  /** Whole days from the reference date until the next due date (0 when due today). */
  daysUntilDue: number;
}

/**
 * Display-only derivation of which debts fall due within the next 30 days.
 *
 * This never feeds the §19 decision engine — it only powers the dashboard card. The engine keeps
 * its own `upcomingDebt30Days` input (the summed minimum payments). Pure given an explicit
 * reference date so it is deterministic in tests; the UI passes `new Date()` at the render boundary.
 */
export function getUpcomingDebts(debts: Debt[], referenceDate: Date): UpcomingDebt[] {
  return debts
    .flatMap((debt) =>
      getUpcomingRecurringDates(debt, referenceDate, UPCOMING_DEBT_WINDOW_DAYS).map((date) => ({
        debt,
        nextDueDate: toDateString(date),
        daysUntilDue: getDaysUntil(date, referenceDate),
      }))
    )
    .sort(byDaysThenPayment);
}

/** Total minimum payment due within the next 30 days. */
export function getUpcomingDebtTotal(debts: Debt[], referenceDate: Date): number {
  return getUpcomingDebts(debts, referenceDate).reduce(
    (total, item) => total + item.debt.minimumPayment,
    0
  );
}

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function byDaysThenPayment(a: UpcomingDebt, b: UpcomingDebt): number {
  if (a.daysUntilDue !== b.daysUntilDue) {
    return a.daysUntilDue - b.daysUntilDue;
  }

  return b.debt.minimumPayment - a.debt.minimumPayment;
}
