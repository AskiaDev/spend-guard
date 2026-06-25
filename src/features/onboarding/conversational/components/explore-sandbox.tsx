"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { calculatePurchaseDecision } from "@/lib/calculations/purchase-decision";
import type { PurchaseDecisionResult, PurchaseInput } from "@/types/finance";
import { SAMPLE_SNAPSHOT } from "../lib/sample-snapshot";
import { ConversationalPrompt } from "./conversational-prompt";
import { MoneyInput } from "./money-input";
import { VerdictReveal } from "./verdict-reveal";
import { VaultButton } from "../../vault/components/primitives/vault-button";
import { VaultField } from "../../vault/components/primitives/vault-field";
import { VaultInput } from "../../vault/components/primitives/vault-input";

// ---- Sample data banner --------------------------------------------------------

function SampleBanner() {
  return (
    <div
      role="note"
      aria-label="Sample data notice"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        borderRadius: "var(--vault-radius-ctl)",
        background: "color-mix(in srgb, var(--vault-accent) 6%, var(--vault-surface))",
        border: "1px solid color-mix(in srgb, var(--vault-accent) 20%, var(--vault-border))",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          flexShrink: 0,
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "var(--vault-accent)",
        }}
      />
      <p
        style={{
          margin: 0,
          fontSize: "0.78rem",
          color: "var(--vault-muted)",
          lineHeight: 1.45,
        }}
      >
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
    <VaultButton onClick={handleSetupReal}>Set up my real guardrail</VaultButton>
  );

  if (result) {
    const purchase: PurchaseInput = {
      itemName: itemName.trim(),
      amount: price,
      urgency: "want",
      paymentMethod: "cash",
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <SampleBanner />
        <VerdictReveal
          result={result}
          purchase={purchase}
          currency={SAMPLE_SNAPSHOT.profile.currency}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ctaButton}
          <VaultButton variant="ghost" onClick={handleReset}>
            Try another item
          </VaultButton>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <SampleBanner />

      <ConversationalPrompt
        eyebrow="Try it out"
        headline="What are you thinking of buying?"
        subtext="Enter any item and price. SpendGuard will run a real check against sample finances - no account needed."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <VaultField label="What is it?" htmlFor="sandbox-item">
          <VaultInput
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

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <VaultButton onClick={handleCheck} disabled={!canCheck}>
          Check if I can buy this
        </VaultButton>
        <VaultButton variant="ghost" onClick={handleSetupReal}>
          Set up my real guardrail
        </VaultButton>
      </div>
    </div>
  );
}
