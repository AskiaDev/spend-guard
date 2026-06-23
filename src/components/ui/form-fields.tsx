import * as React from "react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-xs font-semibold uppercase tracking-normal text-slate-600", className)}
      {...props}
    />
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-control border border-border bg-surface px-3 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-muted",
        className
      )}
      {...props}
    />
  )
);

Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-24 w-full rounded-control border border-border bg-surface px-3 py-2.5 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-muted",
      className
    )}
    {...props}
  />
));

Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "h-11 w-full rounded-control border border-border bg-surface px-3 text-sm text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-muted",
      className
    )}
    {...props}
  />
));

Select.displayName = "Select";

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) {
    return null;
  }

  return <p className="text-xs font-medium text-risk">{children}</p>;
}
