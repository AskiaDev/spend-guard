"use client";

import Dexie, { type EntityTable } from "dexie";
import type {
  CooldownItem,
  Debt,
  Expense,
  FinancialProfile,
  Goal,
  PurchaseCheck,
  WeeklyReport,
} from "@/types/finance";

type ProfileRecord = FinancialProfile & { id: "local" };

export class SpendGuardDatabase extends Dexie {
  profiles!: EntityTable<ProfileRecord, "id">;
  expenses!: EntityTable<Expense, "id">;
  debts!: EntityTable<Debt, "id">;
  goals!: EntityTable<Goal, "id">;
  purchaseChecks!: EntityTable<PurchaseCheck, "id">;
  cooldownItems!: EntityTable<CooldownItem, "id">;
  weeklyReports!: EntityTable<WeeklyReport, "id">;

  constructor() {
    super("spendguard");
    this.version(1).stores({
      profiles: "id",
      expenses: "id,dueDay",
      debts: "id,dueDay",
      goals: "id,priority,targetDate",
      purchaseChecks: "id,createdAt,decision",
      cooldownItems: "id,addedAt,recheckAt",
      weeklyReports: "id,createdAt,weekStart",
    });
  }
}

let database: SpendGuardDatabase | null = null;

export function getLocalDatabase() {
  if (!database) {
    database = new SpendGuardDatabase();
  }

  return database;
}
