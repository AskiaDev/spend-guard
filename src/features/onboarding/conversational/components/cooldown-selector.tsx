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
    <div className="flex flex-col gap-5">
      {/* Cooldown explanation */}
      <p className="vault-muted m-0 text-sm leading-[1.55]">
        A cooldown is a short pause before a purchase counts as cleared. It gives you a
        moment to check with a clear head - not a block, just breathing room.
      </p>

      {/* Radio group */}
      <div
        role="radiogroup"
        aria-label="Cooldown intensity"
        className="flex flex-col gap-[10px]"
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
              className="conv-radio-option flex items-start gap-3 w-full py-4 px-[18px] rounded-[var(--radius-card)] text-foreground cursor-pointer text-left transition-colors duration-150 outline-none border"
              style={{ // ponytail: background and border-color are state-driven (selected)
                background: selected
                  ? "color-mix(in srgb, var(--primary) 8%, var(--card))"
                  : "var(--card)",
                borderColor: selected ? "var(--primary)" : "var(--border)",
              }}
            >
              {/* Radio dot indicator */}
              <span
                aria-hidden="true"
                className="shrink-0 mt-[3px] w-4 h-4 rounded-full transition-[border] duration-150"
                style={{ // ponytail: border and background are state-driven (selected); ink (#0a0e17) has no shadcn token yet
                  border: selected
                    ? "5px solid var(--primary)"
                    : "2px solid var(--border)",
                  background: selected ? "#0a0e17" : "transparent",
                }}
              />
              <span className="flex flex-col gap-[3px]">
                <span
                  className="text-[0.9rem] font-semibold transition-colors duration-150 [font-family:var(--font-hanken),ui-sans-serif,system-ui,sans-serif]"
                  style={{ // ponytail: color is state-driven (selected)
                    color: selected ? "var(--primary)" : "var(--foreground)",
                  }}
                >
                  {opt.label}
                </span>
                <span className="text-[0.78rem] text-muted-foreground leading-[1.4]">
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
