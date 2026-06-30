"use client";

import { addDays, addMonths, startOfWeek } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
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
import {
  financialWorkspaceKeys,
  financialWorkspaceQueryOptions,
  isFinancialWorkspaceEmpty,
} from "@/features/financial-profile/api/financial-workspace-query";
import { saveFinancialProfileAction } from "@/features/financial-profile/api/save-financial-profile";
import {
  createGoalAction,
  deleteGoalAction,
  updateGoalAction,
} from "@/features/goals/api/create-goal";
import {
  markPurchaseCheckStatusAction,
  savePurchaseCheckAction,
} from "@/features/purchase-checker/api/save-purchase-check";
import { saveVoiceSessionAction } from "@/features/purchase-checker/api/save-voice-session";
import { createWeeklyReportAction } from "@/features/reports/api/create-weekly-report";
import { generateWeeklyReportInsights } from "@/features/reports/lib/weekly-report";
import {
  deleteFinancialDataAction,
  deleteVoiceSessionsAction,
  updateProfileSettingsAction,
} from "@/features/settings/api/manage-settings";
import {
  calculateFinancialHealthScore,
  calculateMonthlyFreeCashFlow,
  calculatePurchaseDecision,
  calculateSafeToSpend,
} from "@/lib/calculations/purchase-decision";
import { getCooldownDays } from "@/lib/calculations/cooldown";
import { createFallbackAdvice } from "@/lib/advisor";
import { OFFLINE_MUTATION_MESSAGE, isBrowserOnline } from "@/lib/pwa/network";
import { emptySnapshot } from "@/lib/storage/default-data";
import { createId, toIsoDate } from "@/lib/utils";
import type {
  CooldownItem,
  Debt,
  Expense,
  FinancialProfile,
  Goal,
  PurchaseCheck,
  PurchaseCheckStatus,
  PurchaseInput,
  VoicePurchaseDraft,
  WeeklyReport,
  FinancialWorkspace,
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

function prependUniqueCheck(check: PurchaseCheck, checks: PurchaseCheck[]) {
  return [check, ...checks.filter((existing) => existing.id !== check.id)];
}

function mergeUniqueChecks(pendingChecks: PurchaseCheck[], remoteChecks: PurchaseCheck[]) {
  return pendingChecks.reduceRight(
    (checks, check) => prependUniqueCheck(check, checks),
    remoteChecks
  );
}

function mutationErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useFinancialState() {
  const queryClient = useQueryClient();
  const workspaceQuery = useQuery(financialWorkspaceQueryOptions());
  const workspace = workspaceQuery.data;
  const [pendingLocalChecks, setPendingLocalChecks] = useState<PurchaseCheck[]>([]);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setMutationError(null);
    await queryClient.invalidateQueries({ queryKey: financialWorkspaceKeys.workspace() });
  }, [queryClient]);

  const canRunOnlineMutation = useCallback(() => {
    if (isBrowserOnline()) {
      return true;
    }

    setMutationError(OFFLINE_MUTATION_MESSAGE);
    return false;
  }, []);

  const requireOnlineMutation = useCallback(() => {
    if (!canRunOnlineMutation()) {
      throw new Error(OFFLINE_MUTATION_MESSAGE);
    }
  }, [canRunOnlineMutation]);

  const snapshot = workspace?.snapshot ?? emptySnapshot;
  const checks = useMemo(
    () => mergeUniqueChecks(pendingLocalChecks, workspace?.checks ?? []),
    [pendingLocalChecks, workspace?.checks]
  );
  const cooldownItems = workspace?.cooldownItems ?? [];
  const weeklyReports = workspace?.weeklyReports ?? [];
  const queryError = mutationErrorMessage(workspaceQuery.error, "");
  const error = mutationError ?? (queryError === "" ? null : queryError);
  const isHydrated = workspaceQuery.isFetched;

  const replaceFinancialSetup = useCallback(
    async ({ profile, expenses, debts, goals }: OnboardingPayload) => {
      if (!canRunOnlineMutation()) {
        return;
      }

      const result = await saveFinancialProfileAction({ profile, expenses, debts, goals });

      if (!result.ok) {
        setMutationError(result.error);
        return;
      }

      await refresh();
    },
    [canRunOnlineMutation, refresh]
  );

  const runPurchaseCheck = useCallback(
    async (purchase: PurchaseInput) => {
      const result = calculatePurchaseDecision(snapshot, purchase);
      // Persist the deterministic narrative — instant, offline-safe, and reproducible
      // in history. The richer model explanation streams live in the result card.
      const advisorText = createFallbackAdvice(result, purchase);
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

      requireOnlineMutation();

      const saved = await savePurchaseCheckAction(purchase, checkWithoutIdentity);

      if (!saved.ok) {
        setMutationError(saved.error);
        throw new Error(saved.error);
      }

      const check: PurchaseCheck = {
        ...checkWithoutIdentity,
        id: saved.data.id,
        createdAt: saved.data.createdAt,
      };

      setMutationError(null);
      setPendingLocalChecks((current) => prependUniqueCheck(check, current));
      queryClient.setQueryData<FinancialWorkspace>(
        financialWorkspaceKeys.workspace(),
        (current) =>
          current
            ? {
                ...current,
                checks: prependUniqueCheck(check, current.checks),
              }
            : current
      );
      void refresh();
      return { check, result };
    },
    [queryClient, refresh, requireOnlineMutation, snapshot]
  );

  const markPurchaseCheckStatus = useCallback(
    async (check: PurchaseCheck, status: PurchaseCheckStatus) => {
      requireOnlineMutation();

      const result = await markPurchaseCheckStatusAction(check.id, status);

      if (!result.ok) {
        setMutationError(result.error);
        throw new Error(result.error);
      }

      queryClient.setQueryData<FinancialWorkspace>(
        financialWorkspaceKeys.workspace(),
        (current) =>
          current
            ? {
                ...current,
                checks: current.checks.map((existing) =>
                  existing.id === check.id ? { ...existing, status } : existing
                ),
              }
            : current
      );
      setPendingLocalChecks((current) =>
        current.map((existing) => (existing.id === check.id ? { ...existing, status } : existing))
      );
      await refresh();
      return { ...check, status };
    },
    [queryClient, refresh, requireOnlineMutation]
  );

  const createGoal = useCallback(
    async (goalDraft: GoalDraft) => {
      requireOnlineMutation();

      const result = await createGoalAction(goalDraft);

      if (!result.ok) {
        setMutationError(result.error);
        throw new Error(result.error);
      }

      await refresh();
      return { id: createId("goal"), ...goalDraft };
    },
    [refresh, requireOnlineMutation]
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
      if (!canRunOnlineMutation()) {
        return undefined;
      }

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
        setMutationError(result.error);
        return undefined;
      }

      await refresh();
      return item;
    },
    [canRunOnlineMutation, refresh]
  );

  const removeCooldownItem = useCallback(
    async (id: string) => {
      if (!canRunOnlineMutation()) {
        return;
      }

      const result = await deleteCooldownItemAction(id);

      if (!result.ok) {
        setMutationError(result.error);
        return;
      }

      await refresh();
    },
    [canRunOnlineMutation, refresh]
  );

  const deleteGoal = useCallback(
    async (id: string) => {
      requireOnlineMutation();

      const result = await deleteGoalAction(id);

      if (!result.ok) {
        setMutationError(result.error);
        throw new Error(result.error);
      }

      await refresh();
    },
    [refresh, requireOnlineMutation]
  );

  const updateGoal = useCallback(
    async (id: string, goalDraft: GoalDraft) => {
      requireOnlineMutation();

      const result = await updateGoalAction(id, goalDraft);

      if (!result.ok) {
        setMutationError(result.error);
        throw new Error(result.error);
      }

      await refresh();
    },
    [refresh, requireOnlineMutation]
  );

  const createExpense = useCallback(
    async (expenseDraft: ExpenseDraft) => {
      requireOnlineMutation();

      const result = await createExpenseAction(expenseDraft);

      if (!result.ok) {
        setMutationError(result.error);
        throw new Error(result.error);
      }

      await refresh();
      return { id: createId("expense"), ...expenseDraft };
    },
    [refresh, requireOnlineMutation]
  );

  const updateExpense = useCallback(
    async (id: string, expenseDraft: ExpenseDraft) => {
      requireOnlineMutation();

      const result = await updateExpenseAction(id, expenseDraft);

      if (!result.ok) {
        setMutationError(result.error);
        throw new Error(result.error);
      }

      await refresh();
    },
    [refresh, requireOnlineMutation]
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      requireOnlineMutation();

      const result = await deleteExpenseAction(id);

      if (!result.ok) {
        setMutationError(result.error);
        throw new Error(result.error);
      }

      await refresh();
    },
    [refresh, requireOnlineMutation]
  );

  const createDebt = useCallback(
    async (debtDraft: DebtDraft) => {
      requireOnlineMutation();

      const result = await createDebtAction(debtDraft);

      if (!result.ok) {
        setMutationError(result.error);
        throw new Error(result.error);
      }

      await refresh();
      return { id: createId("debt"), ...debtDraft };
    },
    [refresh, requireOnlineMutation]
  );

  const updateDebt = useCallback(
    async (id: string, debtDraft: DebtDraft) => {
      requireOnlineMutation();

      const result = await updateDebtAction(id, debtDraft);

      if (!result.ok) {
        setMutationError(result.error);
        throw new Error(result.error);
      }

      await refresh();
    },
    [refresh, requireOnlineMutation]
  );

  const deleteDebt = useCallback(
    async (id: string) => {
      requireOnlineMutation();

      const result = await deleteDebtAction(id);

      if (!result.ok) {
        setMutationError(result.error);
        throw new Error(result.error);
      }

      await refresh();
    },
    [refresh, requireOnlineMutation]
  );

  const updateProfileSettings = useCallback(
    async (profile: FinancialProfile) => {
      requireOnlineMutation();

      const result = await updateProfileSettingsAction(profile);

      if (!result.ok) {
        setMutationError(result.error);
        throw new Error(result.error);
      }

      await refresh();
    },
    [refresh, requireOnlineMutation]
  );

  const deleteFinancialData = useCallback(async () => {
    requireOnlineMutation();

    const result = await deleteFinancialDataAction();

    if (!result.ok) {
      setMutationError(result.error);
      throw new Error(result.error);
    }

    await refresh();
  }, [refresh, requireOnlineMutation]);

  const deleteVoiceTranscripts = useCallback(async () => {
    requireOnlineMutation();

    const result = await deleteVoiceSessionsAction();

    if (!result.ok) {
      setMutationError(result.error);
      throw new Error(result.error);
    }

    await refresh();
  }, [refresh, requireOnlineMutation]);

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

    if (!canRunOnlineMutation()) {
      return report;
    }

    const result = await createWeeklyReportAction({
      weekStart: report.weekStart,
      summary: report.summary,
      healthScore: report.healthScore,
      safeToSpend: report.safeToSpend,
    });

    if (!result.ok) {
      setMutationError(result.error);
      return report;
    }

    await refresh();
    return report;
  }, [canRunOnlineMutation, checks, refresh, snapshot]);

  const confirmVoiceDraft = useCallback(
    async (draft: VoicePurchaseDraft) => {
      if (!canRunOnlineMutation()) {
        return;
      }

      const { transcript, ...extractedFields } = draft;
      const result = await saveVoiceSessionAction({ transcript, extractedFields });

      if (!result.ok) {
        setMutationError(result.error);
      }
    },
    [canRunOnlineMutation]
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
    isLoading: workspaceQuery.isLoading,
    isFetching: workspaceQuery.isFetching,
    isStale: workspaceQuery.isStale,
    hasWorkspaceData: Boolean(workspace),
    isWorkspaceEmpty: workspace ? isFinancialWorkspaceEmpty(workspace) : false,
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
    updateGoal,
    createExpense,
    updateExpense,
    deleteExpense,
    createDebt,
    updateDebt,
    deleteDebt,
    updateProfileSettings,
    deleteFinancialData,
    deleteVoiceTranscripts,
    generateWeeklyReport,
    confirmVoiceDraft,
    refresh,
  };
}
