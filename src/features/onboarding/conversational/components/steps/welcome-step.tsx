"use client";

import { Button } from "@/components/ui/button";
import { ConversationalPrompt } from "../conversational-prompt";

interface WelcomeStepProps {
  onStart: () => void;
  onExplore: () => void;
}

export function WelcomeStep({ onStart, onExplore }: WelcomeStepProps) {
  return (
    <div className="flex flex-col gap-8">
      <ConversationalPrompt
        eyebrow="Start"
        headline="Before you buy, ask SpendGuard."
        subtext="Set up your real safe-to-spend number so you can check purchases before they become regrets."
      />

      <div className="flex flex-col gap-3">
        <Button onClick={onStart}>Set up my guardrail</Button>
        <Button variant="ghost" className="text-muted-foreground" onClick={onExplore}>
          I just want to explore
        </Button>
      </div>
    </div>
  );
}
