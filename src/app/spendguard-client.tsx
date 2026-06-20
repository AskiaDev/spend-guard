"use client";

import {
  BarChart3,
  FileText,
  Gauge,
  Landmark,
  ShieldCheck,
  Target,
  TimerReset,
} from "lucide-react";
import { useState } from "react";
import { AuthStatus } from "@/features/auth";
import { CooldownPanel } from "@/features/cooldown";
import { DashboardOverview } from "@/features/dashboard";
import { GoalsPanel } from "@/features/goals";
import { OnboardingSetup } from "@/features/onboarding";
import { PurchaseCheckerPanel } from "@/features/purchase-checker";
import { ReportsPanel } from "@/features/reports";
import { useFinancialState } from "@/hooks/use-financial-state";
import { cn } from "@/lib/utils";

type TabId = "dashboard" | "profile" | "check" | "goals" | "cooldown" | "reports";

const tabs: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: "dashboard", label: "Dashboard", icon: <Gauge className="size-4" /> },
  { id: "profile", label: "Profile", icon: <Landmark className="size-4" /> },
  { id: "check", label: "Can I Buy This?", icon: <ShieldCheck className="size-4" /> },
  { id: "goals", label: "Goals", icon: <Target className="size-4" /> },
  { id: "cooldown", label: "Cooldown", icon: <TimerReset className="size-4" /> },
  { id: "reports", label: "Reports", icon: <FileText className="size-4" /> },
];

export function SpendGuardClient() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const state = useFinancialState();
  const latestCheck = state.checks[0];

  return (
    <main className="min-h-screen bg-[#f7f8f4] text-zinc-950">
      <div className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="border-b border-zinc-200 bg-zinc-950 p-4 text-white lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:border-zinc-800 lg:p-5">
          <div className="flex items-center justify-between gap-3 lg:block">
            <div>
              <div className="flex items-center gap-2">
                <div className="grid size-9 place-items-center rounded-md bg-emerald-400 text-zinc-950">
                  <BarChart3 className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-lg font-semibold leading-none">SpendGuard</p>
                  <p className="mt-1 text-xs text-zinc-400">Can I Buy This?</p>
                </div>
              </div>
            </div>
            <div className="hidden lg:mt-8 lg:block">
              <AuthStatus />
            </div>
          </div>
          <nav className="mt-4 grid grid-flow-col gap-2 overflow-x-auto lg:mt-8 lg:grid-flow-row lg:overflow-visible">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={cn(
                  "flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-left text-sm font-medium text-zinc-300 transition hover:bg-zinc-900 hover:text-white",
                  activeTab === tab.id && "bg-white text-zinc-950 hover:bg-white hover:text-zinc-950"
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        <section className="grid min-w-0 content-start gap-5 p-4 md:p-6 lg:p-10">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-emerald-700">
                Deterministic purchase guard
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-normal text-zinc-950">
                {tabs.find((tab) => tab.id === activeTab)?.label}
              </h1>
            </div>
            <div className="lg:hidden">
              <AuthStatus />
            </div>
          </header>

          {!state.isHydrated ? (
            <div className="rounded-lg border border-zinc-200 bg-white p-8 text-sm text-zinc-600">
              Loading local financial workspace...
            </div>
          ) : null}

          {state.isHydrated && activeTab === "dashboard" ? (
            <DashboardOverview
              snapshot={state.snapshot}
              checks={state.checks}
              metrics={state.metrics}
            />
          ) : null}

          {state.isHydrated && activeTab === "profile" ? (
            <OnboardingSetup
              snapshot={state.snapshot}
              isHydrated={state.isHydrated}
              onSave={state.replaceFinancialSetup}
            />
          ) : null}

          {state.isHydrated && activeTab === "check" ? (
            <PurchaseCheckerPanel
              snapshot={state.snapshot}
              latestCheck={latestCheck}
              onRunCheck={state.runPurchaseCheck}
              onAddGoal={state.addGoalFromCheck}
              onAddCooldown={state.addCooldownFromCheck}
            />
          ) : null}

          {state.isHydrated && activeTab === "goals" ? (
            <GoalsPanel snapshot={state.snapshot} onDeleteGoal={state.deleteGoal} />
          ) : null}

          {state.isHydrated && activeTab === "cooldown" ? (
            <CooldownPanel
              items={state.cooldownItems}
              currency={state.snapshot.profile.currency}
              onRemove={state.removeCooldownItem}
            />
          ) : null}

          {state.isHydrated && activeTab === "reports" ? (
            <ReportsPanel
              reports={state.weeklyReports}
              currency={state.snapshot.profile.currency}
              onGenerateReport={state.generateWeeklyReport}
            />
          ) : null}
        </section>
      </div>
    </main>
  );
}
