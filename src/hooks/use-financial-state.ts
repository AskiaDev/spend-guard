"use client";

import { addDays, addMonths, startOfWeek } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  calculateFinancialHealthScore,
  calculateMonthlyFreeCashFlow,
  calculatePurchaseDecision,
  calculateSafeToSpend,
} from "@/lib/calculations/purchase-decision";
import { createAdvisorText } from "@/lib/advisor";
import { defaultSnapshot } from "@/lib/storage/default-data";
import { getLocalDatabase } from "@/lib/storage/local-database";
import { createId, toIsoDate } from "@/lib/utils";
import type {
  CooldownItem,
  Debt,
  Expense,
  FinancialProfile,
  FinancialSnapshot,
  Goal,
  PurchaseCheck,
  PurchaseInput,
  WeeklyReport,
} from "@/types/finance";

interface OnboardingPayload {
  profile: FinancialProfile;
  expenses: Expense[];
  debts: Debt[];
  goals: Goal[];
}

export function useFinancialState() {
  const [snapshot, setSnapshot] = useState<FinancialSnapshot>(defaultSnapshot);
  const [checks, setChecks] = useState<PurchaseCheck[]>([]);
  const [cooldownItems, setCooldownItems] = useState<CooldownItem[]>([]);
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  const refresh = useCallback(async () => {
    const db = getLocalDatabase();
    const [profile, expenses, debts, goals, savedChecks, savedCooldown, savedReports] =
      await Promise.all([
        db.profiles.get("local"),
        db.expenses.toArray(),
        db.debts.toArray(),
        db.goals.toArray(),
        db.purchaseChecks.orderBy("createdAt").reverse().toArray(),
        db.cooldownItems.orderBy("recheckAt").toArray(),
        db.weeklyReports.orderBy("createdAt").reverse().toArray(),
      ]);

    if (!profile) {
      await db.transaction(
        "rw",
        db.profiles,
        db.expenses,
        db.debts,
        db.goals,
        async () => {
          await db.profiles.put({ id: "local", ...defaultSnapshot.profile });
          await db.expenses.bulkPut(defaultSnapshot.expenses);
          await db.debts.bulkPut(defaultSnapshot.debts);
          await db.goals.bulkPut(defaultSnapshot.goals);
        }
      );
      setSnapshot(defaultSnapshot);
    } else {
      setSnapshot({
        profile: {
          currency: profile.currency,
          monthlyIncome: profile.monthlyIncome,
          currentSavings: profile.currentSavings,
          emergencyFundTarget: profile.emergencyFundTarget,
        },
        expenses,
        debts,
        goals,
      });
    }

    setChecks(savedChecks);
    setCooldownItems(savedCooldown);
    setWeeklyReports(savedReports);
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [refresh]);

  const replaceFinancialSetup = useCallback(
    async ({ profile, expenses, debts, goals }: OnboardingPayload) => {
      const db = getLocalDatabase();
      await db.transaction(
        "rw",
        db.profiles,
        db.expenses,
        db.debts,
        db.goals,
        async () => {
          await db.profiles.put({ id: "local", ...profile });
          await db.expenses.clear();
          await db.debts.clear();
          await db.goals.clear();
          await db.expenses.bulkPut(expenses);
          await db.debts.bulkPut(debts);
          await db.goals.bulkPut(goals);
        }
      );
      await refresh();
    },
    [refresh]
  );

  const runPurchaseCheck = useCallback(
    async (purchase: PurchaseInput) => {
      const result = calculatePurchaseDecision(snapshot, purchase);
      const advisorText = await createAdvisorText(result, purchase);
      const check: PurchaseCheck = {
        id: createId("check"),
        createdAt: new Date().toISOString(),
        ...purchase,
        decision: result.decision,
        safeToSpend: result.safeToSpend,
        monthlyFreeCashFlow: result.monthlyFreeCashFlow,
        cooldownDays: result.cooldownDays,
        advisorText,
        reasons: result.reasons,
      };

      await getLocalDatabase().purchaseChecks.put(check);
      await refresh();
      return { check, result };
    },
    [refresh, snapshot]
  );

  const addGoalFromCheck = useCallback(
    async (check: PurchaseCheck) => {
      const goal: Goal = {
        id: createId("goal"),
        label: check.itemName,
        targetAmount: check.amount,
        savedAmount: 0,
        monthlyContribution: Math.max(1000, Math.ceil(check.amount / 6 / 500) * 500),
        targetDate: toIsoDate(addMonths(new Date(), 6)),
        priority: check.urgency === "need_now" ? "high" : "medium",
      };

      await getLocalDatabase().goals.put(goal);
      await refresh();
      return goal;
    },
    [refresh]
  );

  const addCooldownFromCheck = useCallback(
    async (check: PurchaseCheck) => {
      const days = check.cooldownDays || 7;
      const item: CooldownItem = {
        id: createId("cooldown"),
        itemName: check.itemName,
        amount: check.amount,
        urgency: check.urgency,
        paymentMethod: check.paymentMethod,
        sourceCheckId: check.id,
        addedAt: new Date().toISOString(),
        recheckAt: addDays(new Date(), days).toISOString(),
      };

      await getLocalDatabase().cooldownItems.put(item);
      await refresh();
      return item;
    },
    [refresh]
  );

  const removeCooldownItem = useCallback(
    async (id: string) => {
      await getLocalDatabase().cooldownItems.delete(id);
      await refresh();
    },
    [refresh]
  );

  const deleteGoal = useCallback(
    async (id: string) => {
      await getLocalDatabase().goals.delete(id);
      await refresh();
    },
    [refresh]
  );

  const generateWeeklyReport = useCallback(async () => {
    const safeToSpend = calculateSafeToSpend(snapshot);
    const healthScore = calculateFinancialHealthScore(snapshot);
    const report: WeeklyReport = {
      id: createId("report"),
      createdAt: new Date().toISOString(),
      weekStart: toIsoDate(startOfWeek(new Date(), { weekStartsOn: 1 })),
      healthScore,
      safeToSpend,
      summary: `Health score is ${healthScore}/100. Safe-to-spend is ${snapshot.profile.currency} ${safeToSpend.toLocaleString()}. You ran ${checks.length} purchase checks so far.`,
    };

    await getLocalDatabase().weeklyReports.put(report);
    await refresh();
    return report;
  }, [checks.length, refresh, snapshot]);

  const metrics = useMemo(
    () => ({
      safeToSpend: calculateSafeToSpend(snapshot),
      monthlyFreeCashFlow: calculateMonthlyFreeCashFlow(snapshot),
      healthScore: calculateFinancialHealthScore(snapshot),
    }),
    [snapshot]
  );

  return {
    snapshot,
    checks,
    cooldownItems,
    weeklyReports,
    isHydrated,
    metrics,
    replaceFinancialSetup,
    runPurchaseCheck,
    addGoalFromCheck,
    addCooldownFromCheck,
    removeCooldownItem,
    deleteGoal,
    generateWeeklyReport,
  };
}
