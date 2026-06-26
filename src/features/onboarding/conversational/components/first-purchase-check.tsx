"use client";

import { useCallback, useMemo, useState } from "react";
import { calculatePurchaseDecision } from "@/lib/calculations/purchase-decision";
import { createFallbackAdvice } from "@/lib/advisor/fallback-advisor";
import { savePurchaseCheckAction } from "@/features/purchase-checker/api/save-purchase-check";
import type { PurchaseDecisionResult, PurchaseInput } from "@/types/finance";
import { buildSnapshotFromValues, type OnboardingFormValues } from "../lib/onboarding-form";
import { ConversationalPrompt } from "./conversational-prompt";
import { MoneyInput } from "./money-input";
import { VerdictReveal } from "./verdict-reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VaultField } from "../../vault/components/primitives/vault-field";

const SAMPLE = { itemName: "Wireless headphones", amount: "8000", category: "Electronics" } as const;

// ---- runFirstCheck (pure, testable) -----------------------------------------

export function runFirstCheck(
  values: OnboardingFormValues,
  purchase: PurchaseInput,
): PurchaseDecisionResult {
  const snapshot = buildSnapshotFromValues(values);
  return calculatePurchaseDecision(snapshot, purchase);
}

// ---- FirstPurchaseCheck -----------------------------------------------------

export function FirstPurchaseCheck({
  values,
  onDone,
  onSkip,
}: {
  values: OnboardingFormValues;
  onDone: () => void;
  onSkip: () => void;
}) {
  const [itemName, setItemName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [result, setResult] = useState<PurchaseDecisionResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const price = useMemo(() => {
    const parsed = parseFloat(amount);
    return Number.isNaN(parsed) ? 0 : parsed;
  }, [amount]);

  const canCheck = itemName.trim() !== "" && price > 0 && !checking;

  const fillSample = useCallback(() => {
    setItemName(SAMPLE.itemName);
    setAmount(SAMPLE.amount);
    setCategory(SAMPLE.category);
  }, []);

  const handleCheck = useCallback(async () => {
    if (itemName.trim() === "" || price <= 0) return;

    const purchase: PurchaseInput = {
      itemName: itemName.trim(),
      amount: price,
      category: category.trim() === "" ? undefined : category.trim(),
      notes: note.trim() === "" ? undefined : note.trim(),
      urgency: "want",
      paymentMethod: "cash",
    };

    setChecking(true);
    setSaveError(null);
    const decision = runFirstCheck(values, purchase);
    // Reveal the verdict immediately. The save is best-effort - a failed write must
    // never block the payoff, so we surface a quiet note and keep the verdict on screen.
    setResult(decision);

    const advisorText = createFallbackAdvice(decision, purchase);
    try {
      const saved = await savePurchaseCheckAction(purchase, {
        ...purchase,
        decision: decision.decision,
        riskScore: decision.riskScore,
        safeToSpend: decision.safeToSpend,
        monthlyFreeCashFlow: decision.monthlyFreeCashFlow,
        savingsAfterPurchase: decision.savingsAfterPurchase,
        emergencyProgress: decision.emergencyProgress,
        debtPressure: decision.debtPressure,
        goalDelayMonths: decision.goalDelayMonths,
        healthScore: decision.healthScore,
        cooldownDays: decision.cooldownDays,
        status: "checked",
        advisorText,
        reasons: decision.reasons,
      });
      if (!saved.ok) {
        setSaveError("We could not save this check, but the verdict still stands.");
      }
    } catch {
      setSaveError("We could not save this check, but the verdict still stands.");
    } finally {
      setChecking(false);
    }
  }, [itemName, price, category, note, values]);

  if (result) {
    return (
      <div className="flex flex-col gap-[22px]">
        <VerdictReveal result={result} purchase={{ itemName, amount: price, urgency: "want", paymentMethod: "cash" }} currency={values.currency} />
        {saveError ? (
          <p className="m-0 text-[0.78rem] text-muted-foreground">{saveError}</p>
        ) : null}
        <Button onClick={onDone}>See your guardrail</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[22px]">
      <ConversationalPrompt
        eyebrow="One real check"
        headline="What are you thinking of buying?"
        subtext="Add the item and price. SpendGuard will check the numbers before you decide - this is exactly how it works every day."
      />

      <div className="flex flex-col gap-4">
        <VaultField label="What is it?" htmlFor="conv-check-item">
          <Input
            id="conv-check-item"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="e.g. Wireless headphones"
            autoFocus
          />
        </VaultField>

        <MoneyInput
          id="conv-check-amount"
          label="Price"
          value={amount}
          onChange={setAmount}
          currency={values.currency}
        />

        <VaultField label="Category (optional)" htmlFor="conv-check-category">
          <Input
            id="conv-check-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Electronics"
          />
        </VaultField>

        <VaultField label="Note (optional)" htmlFor="conv-check-note">
          <Input
            id="conv-check-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything SpendGuard should know"
          />
        </VaultField>
      </div>

      <div className="flex flex-wrap gap-[10px] items-center">
        <button
          type="button"
          onClick={fillSample}
          className="conv-chip bg-transparent border border-border rounded-full text-muted-foreground cursor-pointer text-[0.78rem] font-semibold py-[5px] px-[14px]"
        >
          Try a sample
        </button>
        <span
          aria-disabled="true"
          title="Voice input is coming soon"
          className="inline-flex items-center gap-[6px] bg-transparent border border-dashed border-border rounded-full text-muted-foreground text-[0.78rem] font-semibold py-[5px] px-[14px] opacity-[0.55] cursor-not-allowed select-none"
        >
          Voice (coming soon)
        </span>
      </div>

      <div className="flex flex-col gap-[10px]">
        <Button onClick={handleCheck} disabled={!canCheck}>
          {checking ? "Checking..." : "Check if I can buy this"}
        </Button>
        <Button variant="ghost" className="text-muted-foreground" onClick={onSkip}>
          Skip for now
        </Button>
      </div>
    </div>
  );
}
