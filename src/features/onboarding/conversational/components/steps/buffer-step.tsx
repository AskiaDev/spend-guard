"use client";

import { useCallback } from "react";
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
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <ConversationalPrompt
        eyebrow="Emergency buffer"
        headline="How much should stay protected, no matter what?"
        subtext="This is a floor - money SpendGuard will never count as safe to spend. It is not a savings goal."
        why="A buffer means a surprise expense does not force you into a difficult decision."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            gap: 10,
          }}
        >
          {BUFFER_PRESETS.map((preset) => {
            const selected = value === preset;
            return (
              <button
                key={preset}
                type="button"
                aria-pressed={selected}
                onClick={handlePreset(preset)}
                className="conv-buffer-btn"
                style={{
                  padding: "14px 12px",
                  borderRadius: "var(--vault-radius-card)",
                  background: selected
                    ? "color-mix(in srgb, var(--vault-accent) 8%, var(--vault-surface))"
                    : "var(--vault-surface)",
                  border: selected
                    ? "1px solid var(--vault-accent)"
                    : "1px solid var(--vault-border)",
                  color: selected ? "var(--vault-accent)" : "var(--vault-text)",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  fontFamily: "var(--font-hanken), ui-sans-serif, system-ui, sans-serif",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                {PRESET_LABELS[preset]}
              </button>
            );
          })}
        </div>

        <div
          style={{
            opacity: isCustom || value === "" ? 1 : 0.6,
            transition: "opacity 0.15s ease",
          }}
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
