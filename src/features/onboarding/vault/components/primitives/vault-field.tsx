import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";

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
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="text-[0.7rem] font-bold tracking-[0.2em] text-primary">
        {label}
      </Label>
      {children}
      {error ? <span className="text-xs font-medium text-risk">{error}</span> : null}
    </div>
  );
}
