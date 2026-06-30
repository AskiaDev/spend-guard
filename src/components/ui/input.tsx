"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  isBlockedNonNegativeNumberKey,
  sanitizeNonNegativeNumberInput,
} from "@/lib/forms/non-negative-number-input"

function isNonNegativeNumberInput(type: React.ComponentProps<"input">["type"], min: React.ComponentProps<"input">["min"]) {
  if (type !== "number" || min === undefined) {
    return false
  }

  const minValue = Number(min)
  return Number.isFinite(minValue) && minValue >= 0
}

function Input({ className, type, min, onChange, onKeyDown, ...props }: React.ComponentProps<"input">) {
  const shouldSanitizeNumber = isNonNegativeNumberInput(type, min)

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (shouldSanitizeNumber && isBlockedNonNegativeNumberKey(event.key)) {
      event.preventDefault()
    }

    onKeyDown?.(event)
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (shouldSanitizeNumber) {
      const sanitizedValue = sanitizeNonNegativeNumberInput(event.currentTarget.value)

      if (event.currentTarget.value !== sanitizedValue) {
        event.currentTarget.value = sanitizedValue
      }
    }

    onChange?.(event)
  }

  return (
    <input
      type={type}
      min={min}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
