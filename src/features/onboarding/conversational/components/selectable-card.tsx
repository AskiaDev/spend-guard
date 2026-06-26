"use client";

import type { ReactNode } from "react";

export function SelectableCard({
  label,
  description,
  selected,
  onToggle,
  icon,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onToggle: () => void;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onToggle}
      className="flex items-start gap-3 w-full py-4 px-[18px] rounded-[var(--radius-card)] text-foreground cursor-pointer text-left transition-colors duration-150 outline-none border focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      style={{ // ponytail: background and border-color are state-driven (selected prop)
        background: selected
          ? "color-mix(in srgb, var(--primary) 8%, var(--card))"
          : "var(--card)",
        borderColor: selected ? "var(--primary)" : "var(--border)",
      }}
    >
      {icon ? (
        <span className="shrink-0 mt-px" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="flex flex-col gap-[3px]">
        <span
          className="text-[0.9rem] font-semibold transition-colors duration-150 [font-family:var(--font-hanken),ui-sans-serif,system-ui,sans-serif]"
          style={{ // ponytail: color is state-driven (selected prop)
            color: selected ? "var(--primary)" : "var(--foreground)",
          }}
        >
          {label}
        </span>
        {description ? (
          <span className="text-[0.78rem] text-muted-foreground leading-[1.4]">
            {description}
          </span>
        ) : null}
      </span>
    </button>
  );
}
