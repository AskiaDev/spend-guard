import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { CurrencyCode } from "@/types/finance";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: CurrencyCode = "PHP") {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercent(value: number) {
  return new Intl.NumberFormat("en", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value);
}

export function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
