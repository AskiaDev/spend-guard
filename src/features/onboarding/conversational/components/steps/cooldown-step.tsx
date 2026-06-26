"use client";

import type { CooldownPreference } from "@/types/finance";
import { ConversationalPrompt } from "../conversational-prompt";
import { CooldownSelector } from "../cooldown-selector";

interface CooldownStepProps {
  value: CooldownPreference;
  onChange: (v: CooldownPreference) => void;
}

export function CooldownStep({ value, onChange }: CooldownStepProps) {
  return (
    <div className="flex flex-col gap-7">
      <ConversationalPrompt
        eyebrow="Purchase cooldown"
        headline="How firm do you want your pause to be?"
        subtext="SpendGuard recommends a short wait before flagged purchases clear. Choose the level that feels right for how you spend."
      />
      <CooldownSelector value={value} onChange={onChange} />
    </div>
  );
}
