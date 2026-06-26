"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { calculatePurchaseDecision } from "@/lib/calculations/purchase-decision";
import type { PurchaseDecisionResult, PurchaseInput } from "@/types/finance";
import { SAMPLE_SNAPSHOT } from "../lib/sample-snapshot";
import { ConversationalPrompt } from "./conversational-prompt";
import { MoneyInput } from "./money-input";
import { VerdictReveal } from "./verdict-reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VaultField } from "../../vault/components/primitives/vault-field";

// ---- Sample data banner --------------------------------------------------------

function SampleBanner() {
  return (
    <div
      role="note"
      aria-label="Sample data notice"
      className="flex items-center gap-[10px] py-[10px] px-[14px] rounded-control bg-[color-mix(in_srgb,var(--primary)_6%,var(--card))] border border-[color-mix(in_srgb,var(--primary)_20%,var(--border))]"
    >
      <span
        aria-hidden="true"
        className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary"
      />
      <p className="m-0 text-[0.78rem] text-muted-foreground leading-[1.45]">
        This is sample data. The numbers are realistic but not yours - set up your real profile to
        get an accurate check.
      </p>
    </div>
  );
}

// ---- ExploreSandbox ------------------------------------------------------------

/**
 * READ-ONLY purchase checker that runs the real engine against SAMPLE_SNAPSHOT.
 * It never calls savePurchaseCheckAction, never completes onboarding, and never
 * persists anything. Its sole job is to let a visitor experience the verdict flow
 * before they commit to setting up their real guardrail.
 */
export function ExploreSandbox() {
  const router = useRouter();
  const [itemName, setItemName] = useState("");
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState<PurchaseDecisionResult | null>(null);

  const price = useMemo(() => {
    const parsed = parseFloat(amount);
    return Number.isNaN(parsed) ? 0 : parsed;
  }, [amount]);

  const canCheck = itemName.trim() !== "" && price > 0;

  const handleSetupReal = useCallback(() => {
    router.push("/onboarding");
  }, [router]);

  const handleCheck = useCallback(() => {
    if (!canCheck) return;
    const purchase: PurchaseInput = {
      itemName: itemName.trim(),
      amount: price,
      urgency: "want",
      paymentMethod: "cash",
    };
    // Call the real engine directly - no save, no side effects
    setResult(calculatePurchaseDecision(SAMPLE_SNAPSHOT, purchase));
  }, [canCheck, itemName, price]);

  const handleReset = useCallback(() => {
    setResult(null);
    setItemName("");
    setAmount("");
  }, []);

  const ctaButton = (
    <Button onClick={handleSetupReal}>Set up my real guardrail</Button>
  );

  if (result) {
    const purchase: PurchaseInput = {
      itemName: itemName.trim(),
      amount: price,
      urgency: "want",
      paymentMethod: "cash",
    };

    return (
      <div className="flex flex-col gap-[22px]">
        <SampleBanner />
        <VerdictReveal
          result={result}
          purchase={purchase}
          currency={SAMPLE_SNAPSHOT.profile.currency}
        />
        <div className="flex flex-col gap-[10px]">
          {ctaButton}
          <Button variant="ghost" className="text-muted-foreground" onClick={handleReset}>
            Try another item
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[22px]">
      <SampleBanner />

      <ConversationalPrompt
        eyebrow="Try it out"
        headline="What are you thinking of buying?"
        subtext="Enter any item and price. SpendGuard will run a real check against sample finances - no account needed."
      />

      <div className="flex flex-col gap-4">
        <VaultField label="What is it?" htmlFor="sandbox-item">
          <Input
            id="sandbox-item"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="e.g. Sneakers, laptop, weekend trip"
            autoFocus
          />
        </VaultField>

        <MoneyInput
          id="sandbox-amount"
          label="Price"
          value={amount}
          onChange={setAmount}
          currency={SAMPLE_SNAPSHOT.profile.currency}
        />
      </div>

      <div className="flex flex-col gap-[10px]">
        <Button onClick={handleCheck} disabled={!canCheck}>
          Check if I can buy this
        </Button>
        <Button variant="ghost" className="text-muted-foreground" onClick={handleSetupReal}>
          Set up my real guardrail
        </Button>
      </div>
    </div>
  );
}
