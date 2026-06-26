"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { ConversationalPrompt } from "../conversational-prompt";
import { MoneyInput } from "../money-input";

export const BUFFER_PRESETS = ["0", "5000", "10000", "20000"];

const PRESET_LABELS: Record<string, string> = {
  "0": "Not now",
  "5000": "5,000",
  "10000": "10,000",
  "20000": "20,000",
};

export function BufferStep({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const handlePreset = useCallback(
    (preset: string) => () => onChange(preset),
    [onChange],
  );

  const isCustom =
    value !== "" && !BUFFER_PRESETS.includes(value);

  return (
    <div className="flex flex-col gap-7">
      <ConversationalPrompt
        eyebrow="Emergency buffer"
        headline="How much should stay protected, no matter what?"
        subtext="This is a floor - money SpendGuard will never count as safe to spend. It is not a savings goal."
        why="A buffer means a surprise expense does not force you into a difficult decision."
      />

      <div className="flex flex-col gap-4">
        <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(120px,1fr))]">
          {BUFFER_PRESETS.map((preset) => {
            const selected = value === preset;
            return (
              <button
                key={preset}
                type="button"
                aria-pressed={selected}
                onClick={handlePreset(preset)}
                className={cn(
                  "conv-buffer-btn py-[14px] px-3 rounded-[var(--radius-card)] text-[0.9rem] font-semibold font-sans cursor-pointer text-center border",
                  selected
                    ? "bg-primary/[0.08] border-primary text-primary"
                    : "bg-card border-border text-foreground",
                )}
              >
                {PRESET_LABELS[preset]}
              </button>
            );
          })}
        </div>

        <div
          className="transition-opacity duration-150 ease-in-out"
          // ponytail: opacity is data-driven (custom vs preset selected)
          style={{ opacity: isCustom || value === "" ? 1 : 0.6 }}
        >
          <MoneyInput
            id="emergencyBuffer"
            label="Custom amount"
            value={isCustom ? value : ""}
            onChange={onChange}
            currency="PHP"
          />
        </div>
      </div>
    </div>
  );
}
