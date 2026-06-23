import * as React from "react";
import { type VariantProps, cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-blue-700",
        secondary: "bg-surface text-foreground ring-1 ring-border hover:bg-slate-50",
        accent: "bg-safe text-white hover:bg-green-700",
        ghost: "text-slate-700 hover:bg-slate-100",
        danger: "bg-risk text-white hover:bg-red-700",
      },
      size: {
        default: "h-11 px-4",
        sm: "h-11 px-3 text-xs",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  loadingText?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      disabled,
      isLoading = false,
      loadingText = "Loading...",
      size,
      variant,
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      aria-busy={isLoading ? "true" : undefined}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="sr-only">{children}</span>
          <span aria-hidden="true">{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  )
);

Button.displayName = "Button";
