"use client";

import { useCallback, useRef } from "react";
import type { CooldownPreference } from "@/types/finance";

const OPTIONS: {
  value: CooldownPreference;
  label: string;
  description: string;
}[] = [
  {
    value: "light",
    label: "Light pause",
    description: "A short pause before large purchases. Half the usual wait - for low-risk items that still deserve a moment.",
  },
  {
    value: "balanced",
    label: "Balanced pause",
    description: "The default cooldown. Standard wait time before a purchase clears - enough space to think it over.",
  },
  {
    value: "strict",
    label: "Strict pause",
    description: "Twice the usual wait. Best when you want a firmer guardrail before any significant purchase clears.",
  },
];

interface CooldownSelectorProps {
  value: CooldownPreference;
  onChange: (v: CooldownPreference) => void;
}

export function CooldownSelector({ value, onChange }: CooldownSelectorProps) {
  const optionRefs = useRef<Record<CooldownPreference, HTMLButtonElement | null>>({
    light: null,
    balanced: null,
    strict: null,
  });

  // Select an option AND move DOM focus to it - required by the ARIA radio
  // group pattern so keyboard and screen-reader users keep their place when
  // arrow keys change the selection (roving tabIndex strands focus otherwise).
  const select = useCallback(
    (next: CooldownPreference) => {
      onChange(next);
      optionRefs.current[next]?.focus();
    },
    [onChange],
  );

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        select(value);
        return;
      }
      const idx = OPTIONS.findIndex((o) => o.value === value);
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        select(OPTIONS[(idx + 1) % OPTIONS.length].value);
      }
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        select(OPTIONS[(idx - 1 + OPTIONS.length) % OPTIONS.length].value);
      }
    },
    [value, select],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Cooldown explanation */}
      <p
        className="vault-muted"
        style={{
          margin: 0,
          fontSize: "0.875rem",
          lineHeight: 1.55,
        }}
      >
        A cooldown is a short pause before a purchase counts as cleared. It gives you a
        moment to check with a clear head - not a block, just breathing room.
      </p>

      {/* Radio group */}
      <div
        role="radiogroup"
        aria-label="Cooldown intensity"
        style={{ display: "flex", flexDirection: "column", gap: 10 }}
      >
        {OPTIONS.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              ref={(el) => {
                optionRefs.current[opt.value] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(opt.value)}
              onKeyDown={handleKey}
              className="conv-radio-option"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                width: "100%",
                padding: "16px 18px",
                borderRadius: "var(--vault-radius-card)",
                background: selected
                  ? "color-mix(in srgb, var(--vault-accent) 8%, var(--vault-surface))"
                  : "var(--vault-surface)",
                border: selected
                  ? "1px solid var(--vault-accent)"
                  : "1px solid var(--vault-border)",
                color: "var(--vault-text)",
                cursor: "pointer",
                textAlign: "left",
                transition: "background 0.15s ease, border-color 0.15s ease",
                outline: "none",
              }}
            >
              {/* Radio dot indicator */}
              <span
                aria-hidden="true"
                style={{
                  flexShrink: 0,
                  marginTop: 3,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  border: selected
                    ? "5px solid var(--vault-accent)"
                    : "2px solid var(--vault-border)",
                  background: selected ? "var(--vault-ink)" : "transparent",
                  transition: "border 0.15s ease",
                }}
              />
              <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span
                  style={{
                    fontFamily: "var(--font-hanken), ui-sans-serif, system-ui, sans-serif",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    color: selected ? "var(--vault-accent)" : "var(--vault-text)",
                    transition: "color 0.15s ease",
                  }}
                >
                  {opt.label}
                </span>
                <span
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--vault-muted)",
                    lineHeight: 1.4,
                  }}
                >
                  {opt.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
