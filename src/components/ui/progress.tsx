"use client";

import * as React from "react";
import { Progress as ProgressPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Progress({
  className,
  value,
  label,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & { label?: string }) {
  const bounded = Math.max(0, Math.min(100, Math.round(value ?? 0)));

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      aria-label={label}
      value={bounded}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-secondary",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="h-full w-full flex-1 bg-primary transition-all"
        // ponytail: width is data-driven (computed translate from value)
        style={{ transform: `translateX(-${100 - bounded}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
