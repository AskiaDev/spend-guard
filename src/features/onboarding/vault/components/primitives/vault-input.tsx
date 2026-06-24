"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

const VaultInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  (props, ref) => {
    return (
      <input
        ref={ref}
        {...props}
        style={{
          background: "var(--vault-surface)",
          border: "1px solid var(--vault-border)",
          borderRadius: "var(--vault-radius-ctl)",
          color: "var(--vault-text)",
          fontSize: "13px",
          padding: "10px 13px",
          width: "100%",
          boxSizing: "border-box",
          ...props.style,
        }}
      />
    );
  },
);

VaultInput.displayName = "VaultInput";

export { VaultInput };
