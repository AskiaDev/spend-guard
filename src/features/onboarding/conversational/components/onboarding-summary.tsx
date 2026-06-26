"use client";

import { useMemo } from "react";
import { calculateSafeToSpend } from "@/lib/calculations/purchase-decision";
import { calculateEmergencyBuffer } from "@/lib/calculations/emergency-fund";
import { formatCurrency } from "@/lib/utils";
import type { CooldownPreference } from "@/types/finance";
import { buildSnapshotFromValues, type OnboardingFormValues } from "../lib/onboarding-form";
import { ConversationalPrompt } from "./conversational-prompt";
import { Button } from "@/components/ui/button";

const COOLDOWN_LABEL: Record<CooldownPreference, string> = {
  light: "Light pause",
  balanced: "Balanced pause",
  strict: "Strict pause",
};

function ProtectionRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3 border-b border-border">
      <span className="text-[0.85rem] text-muted-foreground">{label}</span>
      <span className="vault-display text-[0.95rem] text-foreground">
        {value}
      </span>
    </div>
  );
}

export function OnboardingSummary({
  values,
  onEnterApp,
}: {
  values: OnboardingFormValues;
  onEnterApp: () => void;
}) {
  const snapshot = useMemo(() => buildSnapshotFromValues(values), [values]);

  const { protectedBuffer, totalBills, debtsConsidered, goalsProtected, safeToSpend } = useMemo(() => {
    const sum = (xs: number[]) => xs.reduce((total, x) => total + x, 0);
    return {
      protectedBuffer: calculateEmergencyBuffer(snapshot.profile),
      totalBills: sum(snapshot.expenses.filter((e) => e.isRecurring).map((e) => e.amount)),
      debtsConsidered: sum(snapshot.debts.map((d) => d.minimumPayment)),
      goalsProtected: sum(snapshot.goals.map((g) => g.monthlyContribution)),
      safeToSpend: calculateSafeToSpend(snapshot),
    };
  }, [snapshot]);

  const currency = values.currency;

  return (
    <div className="flex flex-col gap-6">
      <ConversationalPrompt
        eyebrow="You're ready"
        headline="Your spending guardrail is ready."
        subtext="SpendGuard will now protect your bills, emergency buffer, debt payments, and savings goals before calculating what is safe to spend."
      />

      <div className="flex flex-col pt-1 pb-[18px] px-[18px] rounded-[var(--radius-card)] bg-card border border-border">
        <ProtectionRow label="Protected emergency buffer" value={formatCurrency(protectedBuffer, currency)} />
        <ProtectionRow label="Bills protected each month" value={formatCurrency(totalBills, currency)} />
        <ProtectionRow label="Debt payments considered" value={formatCurrency(debtsConsidered, currency)} />
        <ProtectionRow label="Goals protected each month" value={formatCurrency(goalsProtected, currency)} />
        <ProtectionRow label="Cooldown mode" value={COOLDOWN_LABEL[values.cooldownPreference]} />
      </div>

      <div className="flex flex-col gap-[6px] py-5 px-[22px] rounded-[var(--radius-card)] bg-[color-mix(in_srgb,var(--primary)_8%,var(--card))] border border-[color-mix(in_srgb,var(--primary)_35%,var(--border))]">
        <span className="vault-eyebrow">Safe to spend today</span>
        <span
          className="vault-display text-[clamp(1.8rem,6vw,2.6rem)] leading-[1.05] text-primary"
        >
          {formatCurrency(safeToSpend, currency)}
        </span>
        <span className="text-[0.8rem] text-muted-foreground leading-[1.45]">
          This is what is left after everything above is protected. It updates as your numbers change.
        </span>
      </div>

      <Button onClick={onEnterApp}>Enter SpendGuard</Button>
    </div>
  );
}
