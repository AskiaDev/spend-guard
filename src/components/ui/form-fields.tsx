import * as React from "react";

import { cn } from "@/lib/utils";

export { Input } from "@/components/ui/input";
export { Label } from "@/components/ui/label";
export { Textarea } from "@/components/ui/textarea";

// ponytail: transitional native <Select>. Call sites migrate to Radix <Select> per surface
// in Phase 2/3 (wizard, voice, settings, goals, expenses, onboarding-setup); delete this
// export once the last consumer migrates.
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "h-11 w-full rounded-control border border-input bg-secondary px-3 text-sm text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
));
Select.displayName = "Select";

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="text-xs font-medium text-risk">{children}</p>;
}
