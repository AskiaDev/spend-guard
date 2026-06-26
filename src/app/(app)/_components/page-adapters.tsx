"use client";

import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { CooldownPanel } from "@/features/cooldown";
import { DashboardOverview } from "@/features/dashboard";
import { DebtsPanel } from "@/features/debts";
import { ExpensesPanel } from "@/features/expenses";
import { GoalsPanel } from "@/features/goals";
import {
  CheckerSurface,
  LocalAdvisorGate,
  PurchaseResult,
} from "@/features/purchase-checker";
import { ReportsPanel } from "@/features/reports";
import { SettingsPanel } from "@/features/settings";
import { VoicePurchaseChecker } from "@/features/voice";
import { useFinancialStateContext } from "@/providers/financial-state-provider";

function HydrationNotice() {
  return <PageSkeleton cardCount={3} label="Loading local financial workspace..." />;
}

export function DashboardPageContent() {
  const state = useFinancialStateContext();

  if (!state.isHydrated) {
    return <HydrationNotice />;
  }

  return (
    <DashboardOverview
      snapshot={state.snapshot}
      checks={state.checks}
      metrics={state.metrics}
    />
  );
}

export function PurchaseCheckerPageContent() {
  const state = useFinancialStateContext();

  if (!state.isHydrated) {
    return <HydrationNotice />;
  }

  return (
    <LocalAdvisorGate>
      <CheckerSurface
        onRunCheck={state.runPurchaseCheck}
        onSaveVoiceSession={state.confirmVoiceDraft}
      />
    </LocalAdvisorGate>
  );
}

export function VoicePageContent() {
  const state = useFinancialStateContext();

  if (!state.isHydrated) {
    return <HydrationNotice />;
  }

  return (
    <VoicePurchaseChecker
      onRunCheck={state.runPurchaseCheck}
      onSaveVoiceSession={state.confirmVoiceDraft}
    />
  );
}

export function PurchaseResultPageContent() {
  const state = useFinancialStateContext();

  if (!state.isHydrated) {
    return <HydrationNotice />;
  }

  return (
    <LocalAdvisorGate>
      <PurchaseResult
        check={state.checks[0]}
        currency={state.snapshot.profile.currency}
        onAddGoal={state.addGoalFromCheck}
        onAddCooldown={state.addCooldownFromCheck}
        onMarkStatus={state.markPurchaseCheckStatus}
      />
    </LocalAdvisorGate>
  );
}

export function GoalsPageContent() {
  const state = useFinancialStateContext();

  if (!state.isHydrated) {
    return <HydrationNotice />;
  }

  return (
    <GoalsPanel
      snapshot={state.snapshot}
      monthlyFreeCashFlow={state.metrics.monthlyFreeCashFlow}
      onCreateGoal={state.createGoal}
      onDeleteGoal={state.deleteGoal}
    />
  );
}

export function ExpensesPageContent() {
  const state = useFinancialStateContext();

  if (!state.isHydrated) {
    return <HydrationNotice />;
  }

  return (
    <ExpensesPanel
      expenses={state.snapshot.expenses}
      currency={state.snapshot.profile.currency}
      onCreateExpense={state.createExpense}
      onUpdateExpense={state.updateExpense}
      onDeleteExpense={state.deleteExpense}
    />
  );
}

export function DebtsPageContent() {
  const state = useFinancialStateContext();

  if (!state.isHydrated) {
    return <HydrationNotice />;
  }

  return (
    <DebtsPanel
      debts={state.snapshot.debts}
      currency={state.snapshot.profile.currency}
      onCreateDebt={state.createDebt}
      onUpdateDebt={state.updateDebt}
      onDeleteDebt={state.deleteDebt}
    />
  );
}

export function CooldownPageContent() {
  const state = useFinancialStateContext();

  if (!state.isHydrated) {
    return <HydrationNotice />;
  }

  return (
    <CooldownPanel
      items={state.cooldownItems}
      currency={state.snapshot.profile.currency}
      snapshot={state.snapshot}
      onRemove={state.removeCooldownItem}
      onConvertToGoal={state.addGoalFromCooldown}
    />
  );
}

export function SettingsPageContent() {
  const state = useFinancialStateContext();

  if (!state.isHydrated) {
    return <HydrationNotice />;
  }

  return (
    <SettingsPanel
      profile={state.snapshot.profile}
      onUpdateProfile={state.updateProfileSettings}
      onDeleteFinancialData={state.deleteFinancialData}
      onDeleteVoiceTranscripts={state.deleteVoiceTranscripts}
    />
  );
}

export function ReportsPageContent() {
  const state = useFinancialStateContext();

  if (!state.isHydrated) {
    return <HydrationNotice />;
  }

  return (
    <ReportsPanel
      reports={state.weeklyReports}
      checks={state.checks}
      snapshot={state.snapshot}
      currency={state.snapshot.profile.currency}
      onGenerateReport={state.generateWeeklyReport}
    />
  );
}
