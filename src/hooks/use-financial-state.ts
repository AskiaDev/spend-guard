"use client";

import { addDays, addMonths, startOfWeek } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createCooldownItemAction,
  deleteCooldownItemAction,
} from "@/features/cooldown/api/create-cooldown-item";
import {
  createDebtAction,
  deleteDebtAction,
  updateDebtAction,
} from "@/features/debts/api/manage-debt";
import {
  createExpenseAction,
  deleteExpenseAction,
  updateExpenseAction,
} from "@/features/expenses/api/manage-expense";
import { loadFinancialWorkspaceAction } from "@/features/financial-profile/api/load-financial-workspace";
import { saveFinancialProfileAction } from "@/features/financial-profile/api/save-financial-profile";
import { createGoalAction, deleteGoalAction } from "@/features/goals/api/create-goal";
import {
  markPurchaseCheckStatusAction,
  savePurchaseCheckAction,
} from "@/features/purchase-checker/api/save-purchase-check";
import { saveVoiceSessionAction } from "@/features/purchase-checker/api/save-voice-session";
import { createWeeklyReportAction } from "@/features/reports/api/create-weekly-report";
import { generateWeeklyReportInsights } from "@/features/reports/lib/weekly-report";
import {
  deleteFinancialDataAction,
  updateProfileSettingsAction,
} from "@/features/settings/api/manage-settings";
import {
  calculateFinancialHealthScore,
  calculateMonthlyFreeCashFlow,
  calculatePurchaseDecision,
  calculateSafeToSpend,
} from "@/lib/calculations/purchase-decision";
import { getCooldownDays } from "@/lib/calculations/cooldown";
import { createAdvisorText } from "@/lib/advisor";
import { emptySnapshot } from "@/lib/storage/default-data";
import { createId, toIsoDate } from "@/lib/utils";
import type {
  CooldownItem,
  Debt,
  Expense,
  FinancialProfile,
  FinancialSnapshot,
  Goal,
  PurchaseCheck,
  PurchaseCheckStatus,
  PurchaseInput,
  VoicePurchaseDraft,
  WeeklyReport,
} from "@/types/finance";

interface OnboardingPayload {
  profile: FinancialProfile;
  expenses: Expense[];
  debts: Debt[];
  goals: Goal[];
}

type GoalDraft = Omit<Goal, "id">;
type ExpenseDraft = Omit<Expense, "id">;
type DebtDraft = Omit<Debt, "id">;

export function useFinancialState() {
  const [snapshot, setSnapshot] = useState<FinancialSnapshot>(() => emptySnapshot);
  const [checks, setChecks] = useState<PurchaseCheck[]>([]);
  const [cooldownItems, setCooldownItems] = useState<CooldownItem[]>([]);
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);

    const result = await loadFinancialWorkspaceAction();

    if (!result.ok) {
      setError(result.error);
      setIsHydrated(true);
      return;
    }

    setSnapshot(result.data.snapshot);
    setChecks(result.data.checks);
    setCooldownItems(result.data.cooldownItems);
    setWeeklyReports(result.data.weeklyReports);
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
      const result = await saveFinancialProfileAction({ profile, expenses, debts, goals });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      await refresh();
    },
    [refresh]
  );

  const runPurchaseCheck = useCallback(
    async (purchase: PurchaseInput) => {
      const result = calculatePurchaseDecision(snapshot, purchase);
      const advisorText = await createAdvisorText(result, purchase);
      const checkWithoutIdentity: Omit<PurchaseCheck, "id" | "createdAt"> = {
        ...purchase,
        decision: result.decision,
        riskScore: result.riskScore,
        safeToSpend: result.safeToSpend,
        monthlyFreeCashFlow: result.monthlyFreeCashFlow,
        savingsAfterPurchase: result.savingsAfterPurchase,
        emergencyProgress: result.emergencyProgress,
        debtPressure: result.debtPressure,
        goalDelayMonths: result.goalDelayMonths,
        healthScore: result.healthScore,
        cooldownDays: result.cooldownDays,
        status: "checked",
        advisorText,
        reasons: result.reasons,
      };

      const saved = await savePurchaseCheckAction(purchase, checkWithoutIdentity);

      if (!saved.ok) {
        setError(saved.error);
        throw new Error(saved.error);
      }

      const check: PurchaseCheck = {
        ...checkWithoutIdentity,
        id: saved.data.id,
        createdAt: saved.data.createdAt,
      };

      await refresh();
      return { check, result };
    },
    [refresh, snapshot]
  );

  const markPurchaseCheckStatus = useCallback(
    async (check: PurchaseCheck, status: PurchaseCheckStatus) => {
      const result = await markPurchaseCheckStatusAction(check.id, status);

      if (!result.ok) {
        setError(result.error);
        throw new Error(result.error);
      }

      await refresh();
      return { ...check, status };
    },
    [refresh]
  );

  const createGoal = useCallback(
    async (goalDraft: GoalDraft) => {
      const result = await createGoalAction(goalDraft);

      if (!result.ok) {
        setError(result.error);
        throw new Error(result.error);
      }

      await refresh();
      return { id: createId("goal"), ...goalDraft };
    },
    [refresh]
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

      return createGoal(goal);
    },
    [createGoal]
  );

  const addGoalFromCooldown = useCallback(
    async (item: CooldownItem) => {
      const goal: Goal = {
        id: createId("goal"),
        label: item.itemName,
        targetAmount: item.amount,
        savedAmount: 0,
        monthlyContribution: Math.max(1000, Math.ceil(item.amount / 6 / 500) * 500),
        targetDate: toIsoDate(addMonths(new Date(), 6)),
        priority: item.urgency === "need_now" ? "high" : "medium",
      };

      return createGoal(goal);
    },
    [createGoal]
  );

  const addCooldownFromCheck = useCallback(
    async (check: PurchaseCheck) => {
      const days = check.cooldownDays || getCooldownDays(check.amount);
      const item: CooldownItem = {
        id: createId("cooldown"),
        itemName: check.itemName,
        amount: check.amount,
        urgency: check.urgency,
        paymentMethod: check.paymentMethod,
        sourceCheckId: check.id,
        addedAt: new Date().toISOString(),
        recheckAt: addDays(new Date(), days).toISOString(),
        downPayment: check.downPayment,
        installmentMonths: check.installmentMonths,
        monthlyPayment: check.monthlyPayment,
        isIncomeGenerating: check.isIncomeGenerating,
        currentAlternativeStillWorks: check.currentAlternativeStillWorks,
        baselineDecision: check.decision,
        baselineRiskScore: check.riskScore,
        baselineSafeToSpend: check.safeToSpend,
      };

      const result = await createCooldownItemAction({
        itemName: item.itemName,
        amount: item.amount,
        urgency: item.urgency,
        paymentMethod: item.paymentMethod,
        sourceCheckId: item.sourceCheckId,
        recheckAt: item.recheckAt,
        downPayment: item.downPayment,
        installmentMonths: item.installmentMonths,
        monthlyPayment: item.monthlyPayment,
        isIncomeGenerating: item.isIncomeGenerating,
        currentAlternativeStillWorks: item.currentAlternativeStillWorks,
        baselineDecision: item.baselineDecision,
        baselineRiskScore: item.baselineRiskScore,
        baselineSafeToSpend: item.baselineSafeToSpend,
      });

      if (!result.ok) {
        setError(result.error);
        return undefined;
      }

      await refresh();
      return item;
    },
    [refresh]
  );

  const removeCooldownItem = useCallback(
    async (id: string) => {
      const result = await deleteCooldownItemAction(id);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      await refresh();
    },
    [refresh]
  );

  const deleteGoal = useCallback(
    async (id: string) => {
      const result = await deleteGoalAction(id);

      if (!result.ok) {
        setError(result.error);
        throw new Error(result.error);
      }

      await refresh();
    },
    [refresh]
  );

  const createExpense = useCallback(
    async (expenseDraft: ExpenseDraft) => {
      const result = await createExpenseAction(expenseDraft);

      if (!result.ok) {
        setError(result.error);
        throw new Error(result.error);
      }

      await refresh();
      return { id: createId("expense"), ...expenseDraft };
    },
    [refresh]
  );

  const updateExpense = useCallback(
    async (id: string, expenseDraft: ExpenseDraft) => {
      const result = await updateExpenseAction(id, expenseDraft);

      if (!result.ok) {
        setError(result.error);
        throw new Error(result.error);
      }

      await refresh();
    },
    [refresh]
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      const result = await deleteExpenseAction(id);

      if (!result.ok) {
        setError(result.error);
        throw new Error(result.error);
      }

      await refresh();
    },
    [refresh]
  );

  const createDebt = useCallback(
    async (debtDraft: DebtDraft) => {
      const result = await createDebtAction(debtDraft);

      if (!result.ok) {
        setError(result.error);
        throw new Error(result.error);
      }

      await refresh();
      return { id: createId("debt"), ...debtDraft };
    },
    [refresh]
  );

  const updateDebt = useCallback(
    async (id: string, debtDraft: DebtDraft) => {
      const result = await updateDebtAction(id, debtDraft);

      if (!result.ok) {
        setError(result.error);
        throw new Error(result.error);
      }

      await refresh();
    },
    [refresh]
  );

  const deleteDebt = useCallback(
    async (id: string) => {
      const result = await deleteDebtAction(id);

      if (!result.ok) {
        setError(result.error);
        throw new Error(result.error);
      }

      await refresh();
    },
    [refresh]
  );

  const updateProfileSettings = useCallback(
    async (profile: FinancialProfile) => {
      const result = await updateProfileSettingsAction(profile);

      if (!result.ok) {
        setError(result.error);
        throw new Error(result.error);
      }

      await refresh();
    },
    [refresh]
  );

  const deleteFinancialData = useCallback(async () => {
    const result = await deleteFinancialDataAction();

    if (!result.ok) {
      setError(result.error);
      throw new Error(result.error);
    }

    await refresh();
  }, [refresh]);

  const generateWeeklyReport = useCallback(async () => {
    const safeToSpend = calculateSafeToSpend(snapshot);
    const healthScore = calculateFinancialHealthScore(snapshot);
    const weekStart = toIsoDate(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const insights = generateWeeklyReportInsights({
      snapshot,
      checks,
      weekStart,
      currency: snapshot.profile.currency,
    });
    const report: WeeklyReport = {
      id: createId("report"),
      createdAt: new Date().toISOString(),
      weekStart,
      healthScore,
      safeToSpend,
      summary: insights.narrative,
    };

    const result = await createWeeklyReportAction({
      weekStart: report.weekStart,
      summary: report.summary,
      healthScore: report.healthScore,
      safeToSpend: report.safeToSpend,
    });

    if (!result.ok) {
      setError(result.error);
      return report;
    }

    await refresh();
    return report;
  }, [checks, refresh, snapshot]);

  const confirmVoiceDraft = useCallback(
    async (draft: VoicePurchaseDraft) => {
      const { transcript, ...extractedFields } = draft;
      const result = await saveVoiceSessionAction({ transcript, extractedFields });

      if (!result.ok) {
        setError(result.error);
      }
    },
    []
  );

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
    error,
    metrics,
    replaceFinancialSetup,
    runPurchaseCheck,
    createGoal,
    addGoalFromCheck,
    addGoalFromCooldown,
    addCooldownFromCheck,
    markPurchaseCheckStatus,
    removeCooldownItem,
    deleteGoal,
    createExpense,
    updateExpense,
    deleteExpense,
    createDebt,
    updateDebt,
    deleteDebt,
    updateProfileSettings,
    deleteFinancialData,
    generateWeeklyReport,
    confirmVoiceDraft,
    refresh,
  };
}
