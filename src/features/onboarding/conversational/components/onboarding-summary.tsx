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
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 16,
        padding: "12px 0",
        borderBottom: "1px solid var(--vault-border)",
      }}
    >
      <span style={{ fontSize: "0.85rem", color: "var(--vault-muted)" }}>{label}</span>
      <span className="vault-display" style={{ fontSize: "0.95rem", color: "var(--vault-text)" }}>
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
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <ConversationalPrompt
        eyebrow="You're ready"
        headline="Your spending guardrail is ready."
        subtext="SpendGuard will now protect your bills, emergency buffer, debt payments, and savings goals before calculating what is safe to spend."
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "4px 18px 18px",
          borderRadius: "var(--vault-radius-card)",
          background: "var(--vault-surface)",
          border: "1px solid var(--vault-border)",
        }}
      >
        <ProtectionRow label="Protected emergency buffer" value={formatCurrency(protectedBuffer, currency)} />
        <ProtectionRow label="Bills protected each month" value={formatCurrency(totalBills, currency)} />
        <ProtectionRow label="Debt payments considered" value={formatCurrency(debtsConsidered, currency)} />
        <ProtectionRow label="Goals protected each month" value={formatCurrency(goalsProtected, currency)} />
        <ProtectionRow label="Cooldown mode" value={COOLDOWN_LABEL[values.cooldownPreference]} />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          padding: "20px 22px",
          borderRadius: "var(--vault-radius-card)",
          background: "color-mix(in srgb, var(--vault-accent) 8%, var(--vault-surface))",
          border: "1px solid color-mix(in srgb, var(--vault-accent) 35%, var(--vault-border))",
        }}
      >
        <span className="vault-eyebrow">Safe to spend today</span>
        <span
          className="vault-display"
          style={{ fontSize: "clamp(1.8rem, 6vw, 2.6rem)", lineHeight: 1.05, color: "var(--vault-accent)" }}
        >
          {formatCurrency(safeToSpend, currency)}
        </span>
        <span style={{ fontSize: "0.8rem", color: "var(--vault-muted)", lineHeight: 1.45 }}>
          This is what is left after everything above is protected. It updates as your numbers change.
        </span>
      </div>

      <Button onClick={onEnterApp}>Enter SpendGuard</Button>
    </div>
  );
}
