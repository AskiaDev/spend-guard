import * as React from "react";
import { type VariantProps, cva } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const dangerClasses = "bg-[var(--risk)] text-[var(--risk-foreground)] hover:brightness-110";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control text-sm font-semibold transition-[color,background-color,box-shadow,filter] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:brightness-105 hover:shadow-[0_0_0_1px_rgb(198_242_78/0.35),0_8px_28px_rgb(198_242_78/0.20)]",
        secondary: "glass text-secondary-foreground hover:brightness-110",
        accent: "bg-[var(--chart-2)] text-[var(--safe-foreground)] hover:brightness-110",
        ghost: "text-foreground hover:bg-accent",
        outline: "border border-input bg-transparent text-foreground hover:bg-accent",
        danger: dangerClasses,
        destructive: dangerClasses,
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4",
        sm: "h-11 px-3 text-xs",
        lg: "h-12 px-6",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
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
    { children, className, disabled, isLoading = false, loadingText = "Loading...", size, variant, ...props },
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
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
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

export { buttonVariants };
