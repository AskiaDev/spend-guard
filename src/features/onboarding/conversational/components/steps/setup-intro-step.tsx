"use client";

import { Button } from "@/components/ui/button";
import { ConversationalPrompt } from "../conversational-prompt";

interface SetupIntroStepProps {
  onContinue: () => void;
}

export function SetupIntroStep({ onContinue }: SetupIntroStepProps) {
  return (
    <div className="flex flex-col gap-8">
      <ConversationalPrompt
        eyebrow="Setup"
        headline="Let's build your spending guardrail."
        subtext="We'll protect money for bills, debt, savings, and emergencies before calling anything safe to spend. The money already spoken for never counts as available."
      />

      <div className="flex flex-col gap-2.5 rounded-[var(--radius-card)] border border-border bg-card px-6 py-5">
        {[
          "Bills and recurring commitments",
          "Debt payments due this month",
          "Your savings goals",
          "An emergency buffer",
        ].map((item) => (
          <div key={item} className="flex items-center gap-2.5 text-sm text-foreground">
            <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-primary" />
            {item}
          </div>
        ))}
      </div>

      <Button onClick={onContinue}>{"Got it, let's go"}</Button>
    </div>
  );
}
