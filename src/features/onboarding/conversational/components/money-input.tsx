"use client";

import type { CurrencyCode } from "@/types/finance";
import { VaultField } from "../../vault/components/primitives/vault-field";

export function MoneyInput({
  id,
  label,
  value,
  onChange,
  currency,
  autoFocus,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  currency: CurrencyCode;
  autoFocus?: boolean;
}) {
  return (
    <VaultField label={label} htmlFor={id}>
      <div
        className="conv-money"
        style={{
          display: "flex",
          alignItems: "center",
          background: "var(--vault-surface)",
          border: "1px solid var(--vault-border)",
          borderRadius: "var(--vault-radius-ctl)",
          overflow: "hidden",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            padding: "10px 12px",
            fontSize: "0.7rem",
            letterSpacing: "0.2em",
            fontWeight: 700,
            color: "var(--vault-accent)",
            borderRight: "1px solid var(--vault-border)",
            flexShrink: 0,
            userSelect: "none",
          }}
        >
          {currency}
        </span>
        <input
          id={id}
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus={autoFocus}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            color: "var(--vault-text)",
            fontSize: "13px",
            padding: "10px 13px",
            outline: "none",
            width: "100%",
            boxSizing: "border-box",
          }}
        />
      </div>
    </VaultField>
  );
}
