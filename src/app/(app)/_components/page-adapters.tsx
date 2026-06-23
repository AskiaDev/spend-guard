"use client";

import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { CooldownPanel } from "@/features/cooldown";
import { DashboardOverview } from "@/features/dashboard";
import { GoalsPanel } from "@/features/goals";
import { OnboardingSetup } from "@/features/onboarding";
import { PurchaseCheckerWizard, PurchaseResult } from "@/features/purchase-checker";
import { ReportsPanel } from "@/features/reports";
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

  return <PurchaseCheckerWizard onRunCheck={state.runPurchaseCheck} />;
}

export function VoicePageContent() {
  const state = useFinancialStateContext();

  if (!state.isHydrated) {
    return <HydrationNotice />;
  }

  return <VoicePurchaseChecker onRunCheck={state.runPurchaseCheck} />;
}

export function PurchaseResultPageContent() {
  const state = useFinancialStateContext();

  if (!state.isHydrated) {
    return <HydrationNotice />;
  }

  return (
    <PurchaseResult
      check={state.checks[0]}
      currency={state.snapshot.profile.currency}
      onAddGoal={state.addGoalFromCheck}
      onAddCooldown={state.addCooldownFromCheck}
    />
  );
}

export function GoalsPageContent() {
  const state = useFinancialStateContext();

  if (!state.isHydrated) {
    return <HydrationNotice />;
  }

  return <GoalsPanel snapshot={state.snapshot} onDeleteGoal={state.deleteGoal} />;
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
      onRemove={state.removeCooldownItem}
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
      currency={state.snapshot.profile.currency}
      onGenerateReport={state.generateWeeklyReport}
    />
  );
}

export function OnboardingPageContent() {
  const state = useFinancialStateContext();

  if (!state.isHydrated) {
    return <HydrationNotice />;
  }

  return (
    <OnboardingSetup
      snapshot={state.snapshot}
      isHydrated={state.isHydrated}
      onSave={state.replaceFinancialSetup}
    />
  );
}
