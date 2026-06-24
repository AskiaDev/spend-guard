"use client";
import { VaultButton } from "./vault-button";

export function EmptyState({
  title,
  hint,
  actionLabel,
  onAdd,
}: {
  title: string;
  hint: string;
  actionLabel: string;
  onAdd: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: "36px 24px",
        border: "1px dashed var(--vault-border)",
        borderRadius: "var(--vault-radius-card)",
        textAlign: "center",
      }}
    >
      <p
        style={{
          color: "var(--vault-text)",
          fontSize: "1rem",
          fontWeight: 600,
          margin: 0,
        }}
      >
        {title}
      </p>
      <p
        style={{
          color: "var(--vault-muted)",
          fontSize: "0.82rem",
          margin: 0,
          maxWidth: 260,
        }}
      >
        {hint}
      </p>
      <VaultButton onClick={onAdd}>{actionLabel}</VaultButton>
    </div>
  );
}
