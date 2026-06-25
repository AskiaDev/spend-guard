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
      className="conv-card"
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
      {icon ? (
        <span style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true">
          {icon}
        </span>
      ) : null}
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
          {label}
        </span>
        {description ? (
          <span
            style={{
              fontSize: "0.78rem",
              color: "var(--vault-muted)",
              lineHeight: 1.4,
            }}
          >
            {description}
          </span>
        ) : null}
      </span>
    </button>
  );
}
