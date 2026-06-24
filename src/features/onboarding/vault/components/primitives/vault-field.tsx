import type { ReactNode } from "react";

export function VaultField({
  label,
  error,
  htmlFor,
  children,
}: {
  label: string;
  error?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={htmlFor} className="vault-eyebrow">
        {label}
      </label>
      {children}
      {error ? (
        <span style={{ color: "var(--vault-danger)", fontSize: "0.72rem", fontWeight: 500 }}>{error}</span>
      ) : null}
    </div>
  );
}
