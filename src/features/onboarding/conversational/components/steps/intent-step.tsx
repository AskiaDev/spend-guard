"use client";

import { useCallback } from "react";
import { ConversationalPrompt } from "../conversational-prompt";
import { SelectableCard } from "../selectable-card";

export const INTENT_OPTIONS: { id: string; label: string }[] = [
  { id: "stop_impulse", label: "Stop impulse purchases" },
  { id: "protect_bills", label: "Make sure bills are always covered" },
  { id: "build_savings", label: "Build savings without thinking about it" },
  { id: "track_goals", label: "Stay on track with a savings goal" },
  { id: "reduce_stress", label: "Reduce money stress day to day" },
  { id: "know_safe_amount", label: "Know exactly how much is safe to spend" },
];

interface IntentStepProps {
  value: string[];
  onChange: (v: string[]) => void;
}

export function IntentStep({ value, onChange }: IntentStepProps) {
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
        headline="What do you want SpendGuard to help with?"
        subtext="Pick as many as feel right. This helps us set the right tone."
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 12,
        }}
      >
        {INTENT_OPTIONS.map((opt) => (
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
