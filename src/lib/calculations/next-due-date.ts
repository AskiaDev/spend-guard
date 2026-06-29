const DAY_MS = 24 * 60 * 60 * 1000;
const BIWEEKLY_DAYS = 14;
const WINDOW_DAYS = 30;

export interface RecurringSchedule {
  dueDay: number;
  paymentCadence?: "monthly" | "semi_monthly" | "biweekly";
  nextDueDate?: string;
  secondDueDay?: number;
}

export interface RecurringPayment extends RecurringSchedule {
  amount: number;
}

export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  }).format(date);
}

export function getNextMonthlyDueDate(dueDay: number, referenceDate: Date): Date {
  const today = startOfDay(referenceDate);
  const candidate = clampToMonth(today.getFullYear(), today.getMonth(), dueDay);

  if (candidate.getTime() >= today.getTime()) {
    return candidate;
  }

  return clampToMonth(today.getFullYear(), today.getMonth() + 1, dueDay);
}

export function formatNextMonthlyDueDate(dueDays: number[], referenceDate: Date): string {
  if (dueDays.length === 0) {
    return "None";
  }

  const today = startOfDay(referenceDate);
  const next = dueDays
    .map((dueDay) => getNextMonthlyDueDate(dueDay, today))
    .sort((a, b) => a.getTime() - b.getTime())[0];

  return formatShortDate(next);
}

export function getNextRecurringDueDate(
  schedule: RecurringSchedule,
  referenceDate: Date
): Date {
  if (schedule.paymentCadence === "biweekly" && schedule.nextDueDate) {
    return getNextBiweeklyDueDate(schedule.nextDueDate, referenceDate);
  }

  if (schedule.paymentCadence === "semi_monthly") {
    return getSemiMonthlyDueDates(schedule, referenceDate, WINDOW_DAYS * 2)[0];
  }

  return getNextMonthlyDueDate(schedule.dueDay, referenceDate);
}

export function formatNextRecurringDueDate(
  schedules: RecurringSchedule[],
  referenceDate: Date
): string {
  if (schedules.length === 0) {
    return "None";
  }

  const next = schedules
    .map((schedule) => getNextRecurringDueDate(schedule, referenceDate))
    .sort((a, b) => a.getTime() - b.getTime())[0];

  return formatShortDate(next);
}

export function getMonthlyRecurringAmount(amount: number, cadence: string | undefined): number {
  if (cadence === "semi_monthly") {
    return amount * 2;
  }

  return cadence === "biweekly" ? amount * (26 / 12) : amount;
}

export function getUpcomingRecurringPaymentTotal(
  payments: RecurringPayment[],
  referenceDate: Date,
  windowDays = WINDOW_DAYS
): number {
  return payments.reduce(
    (total, payment) =>
      total + getUpcomingRecurringDates(payment, referenceDate, windowDays).length * payment.amount,
    0
  );
}

export function getUpcomingRecurringDates(
  schedule: RecurringSchedule,
  referenceDate: Date,
  windowDays = WINDOW_DAYS
): Date[] {
  if (schedule.paymentCadence === "semi_monthly") {
    return getSemiMonthlyDueDates(schedule, referenceDate, windowDays);
  }

  const firstDueDate = getNextRecurringDueDate(schedule, referenceDate);
  const daysUntilFirstDue = getDaysUntil(firstDueDate, referenceDate);

  if (daysUntilFirstDue < 0 || daysUntilFirstDue > windowDays) {
    return [];
  }

  if (schedule.paymentCadence !== "biweekly") {
    return [firstDueDate];
  }

  const dates: Date[] = [];
  for (
    let next = firstDueDate;
    getDaysUntil(next, referenceDate) <= windowDays;
    next = addDays(next, BIWEEKLY_DAYS)
  ) {
    dates.push(next);
  }

  return dates;
}

export function getDaysUntil(date: Date, referenceDate: Date): number {
  return Math.round((startOfDay(date).getTime() - startOfDay(referenceDate).getTime()) / DAY_MS);
}

function getNextBiweeklyDueDate(nextDueDate: string, referenceDate: Date): Date {
  const anchor = parseLocalIsoDate(nextDueDate);
  const today = startOfDay(referenceDate);

  if (!anchor || anchor.getTime() >= today.getTime()) {
    return anchor ?? getNextMonthlyDueDate(1, referenceDate);
  }

  const elapsedDays = Math.round((today.getTime() - anchor.getTime()) / DAY_MS);
  const periodsElapsed = Math.ceil(elapsedDays / BIWEEKLY_DAYS);

  return addDays(anchor, periodsElapsed * BIWEEKLY_DAYS);
}

function getSemiMonthlyDueDates(
  schedule: RecurringSchedule,
  referenceDate: Date,
  windowDays: number
): Date[] {
  const today = startOfDay(referenceDate);
  const dueDays = [...new Set([schedule.dueDay, schedule.secondDueDay ?? schedule.dueDay])]
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 31)
    .sort((a, b) => a - b);
  const dates: Date[] = [];
  const monthCount = Math.ceil(windowDays / 28) + 1;

  for (let offset = 0; offset <= monthCount; offset += 1) {
    for (const dueDay of dueDays) {
      const date = clampToMonth(today.getFullYear(), today.getMonth() + offset, dueDay);
      const daysUntil = getDaysUntil(date, today);

      if (daysUntil >= 0 && daysUntil <= windowDays) {
        dates.push(date);
      }
    }
  }

  return [...new Map(dates.map((date) => [date.getTime(), date])).values()].sort(
    (a, b) => a.getTime() - b.getTime()
  );
}

function clampToMonth(year: number, month: number, day: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay));
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function parseLocalIsoDate(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return null;
  }

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}
