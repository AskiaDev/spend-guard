"use client";

import { useCallback } from "react";
import { ConversationalPrompt } from "../conversational-prompt";
import { SelectableCard } from "../selectable-card";

export const PAIN_POINT_OPTIONS: { id: string; label: string }[] = [
  { id: "only_check_balance", label: "I only check my balance after spending" },
  { id: "forget_bills", label: "I sometimes forget when bills are due" },
  { id: "impulse_online", label: "Online shopping is too easy to say yes to" },
  { id: "savings_dont_stick", label: "I save, then end up spending it anyway" },
  { id: "payday_pressure", label: "Money feels tight right before payday" },
  { id: "no_clear_picture", label: "I never have a clear picture of where I stand" },
];

interface PainPointsStepProps {
  value: string[];
  onChange: (v: string[]) => void;
}

export function PainPointsStep({ value, onChange }: PainPointsStepProps) {
  const toggle = useCallback(
    (id: string) => {
      if (value.includes(id)) {
        onChange(value.filter((v) => v !== id));
      } else {
        onChange([...value, id]);
      }
    },
    [value, onChange],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <ConversationalPrompt
        eyebrow="Habits"
        headline="What tends to trip you up with spending?"
        subtext="No judgment here - these patterns are common. Knowing them helps SpendGuard protect you better."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 12,
        }}
      >
        {PAIN_POINT_OPTIONS.map((opt) => (
          <SelectableCard
            key={opt.id}
            label={opt.label}
            selected={value.includes(opt.id)}
            onToggle={() => toggle(opt.id)}
          />
        ))}
      </div>
    </div>
  );
}
