"use client";
import type { ReactNode } from "react";

export function RepeatableRow({
  onRemove,
  children,
}: {
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "var(--vault-surface)",
        border: "1px solid var(--vault-border)",
        borderRadius: "var(--vault-radius-ctl)",
        padding: "10px 14px",
      }}
    >
      <div style={{ flex: 1 }}>{children}</div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove row"
        style={{
          background: "transparent",
          border: "none",
          color: "var(--vault-muted)",
          cursor: "pointer",
          fontSize: "1.1rem",
          lineHeight: 1,
          padding: "2px 6px",
          borderRadius: "var(--vault-radius-ctl)",
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}
