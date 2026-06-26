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
        className="conv-money flex items-center bg-card border border-border rounded-control overflow-hidden"
      >
        <span
          aria-hidden="true"
          className="py-[10px] px-3 text-[0.7rem] tracking-[0.2em] font-bold text-primary border-r border-border shrink-0 select-none"
        >
          {currency}
        </span>
        <input
          id={id}
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus={autoFocus}
          className="flex-1 bg-transparent border-none text-foreground text-[13px] py-[10px] px-[13px] outline-none w-full box-border"
        />
      </div>
    </VaultField>
  );
}
