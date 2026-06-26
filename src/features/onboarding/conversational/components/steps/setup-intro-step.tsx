"use client";

import { Button } from "@/components/ui/button";
import { ConversationalPrompt } from "../conversational-prompt";

interface SetupIntroStepProps {
  onContinue: () => void;
}

export function SetupIntroStep({ onContinue }: SetupIntroStepProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <ConversationalPrompt
        eyebrow="Setup"
        headline="Let's build your spending guardrail."
        subtext="We'll protect money for bills, debt, savings, and emergencies before calling anything safe to spend. The money already spoken for never counts as available."
      />

      <div
        style={{
          padding: "20px 24px",
          borderRadius: "var(--vault-radius-card)",
          background: "var(--vault-surface)",
          border: "1px solid var(--vault-border)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {[
          "Bills and recurring commitments",
          "Debt payments due this month",
          "Your savings goals",
          "An emergency buffer",
        ].map((item) => (
          <div
            key={item}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: "0.875rem",
              color: "var(--vault-text)",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--vault-accent)",
                flexShrink: 0,
              }}
            />
            {item}
          </div>
        ))}
      </div>

      <Button onClick={onContinue}>{"Got it, let's go"}</Button>
    </div>
  );
}
