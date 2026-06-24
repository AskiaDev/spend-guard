"use client";
import type { ReactNode } from "react";

export function VaultButton({
  variant = "primary",
  type = "button",
  onClick,
  disabled,
  children,
}: {
  variant?: "primary" | "ghost";
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  const base = {
    borderRadius: "var(--vault-radius-ctl)",
    fontWeight: 700,
    padding: "12px 20px",
    fontSize: "0.9rem",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "transform .12s ease, background .12s ease",
  } as const;
  const styles =
    variant === "primary"
      ? { ...base, background: "var(--vault-accent)", color: "var(--vault-ink)", border: "none" }
      : { ...base, background: "transparent", color: "var(--vault-muted)", border: "none" };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={styles}>
      {children}
    </button>
  );
}
