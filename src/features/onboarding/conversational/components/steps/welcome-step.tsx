"use client";

import { VaultButton } from "@/features/onboarding/vault/components/primitives/vault-button";
import { ConversationalPrompt } from "../conversational-prompt";

interface WelcomeStepProps {
  onStart: () => void;
  onExplore: () => void;
}

export function WelcomeStep({ onStart, onExplore }: WelcomeStepProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <ConversationalPrompt
        eyebrow="Start"
        headline="Before you buy, ask SpendGuard."
        subtext="Set up your real safe-to-spend number so you can check purchases before they become regrets."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <VaultButton variant="primary" onClick={onStart}>
          Set up my guardrail
        </VaultButton>
        <VaultButton variant="ghost" onClick={onExplore}>
          I just want to explore
        </VaultButton>
      </div>
    </div>
  );
}
