"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// Date fields across the app store a plain `YYYY-MM-DD` string (the format a native
// `<input type="date">` emits). We build/read Date objects in LOCAL time so a date
// never shifts a day in negative-offset zones the way `new Date("YYYY-MM-DD")` (UTC) would.
const isoDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/

function parseLocalDate(value: string): Date | undefined {
  const match = isoDatePattern.exec(value)
  if (!match) return undefined
  const [, year, month, day] = match
  return new Date(Number(year), Number(month) - 1, Number(day))
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const displayFormatter = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

export function DatePicker({
  value,
  onChange,
  id,
  placeholder = "Pick a date",
  disabled,
  ariaInvalid,
  ariaDescribedBy,
  className,
}: {
  value: string
  onChange: (value: string) => void
  id?: string
  placeholder?: string
  disabled?: boolean
  ariaInvalid?: boolean
  ariaDescribedBy?: string
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const selected = parseLocalDate(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-invalid={ariaInvalid || undefined}
          aria-describedby={ariaDescribedBy}
          data-empty={!selected || undefined}
          className={cn(
            "h-9 w-full justify-start gap-2 px-3 text-sm font-normal data-[empty=true]:text-muted-foreground",
            className
          )}
        >
          <CalendarIcon
            className="size-4 shrink-0 opacity-70"
            aria-hidden="true"
          />
          {selected ? displayFormatter.format(selected) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            onChange(date ? formatLocalDate(date) : "")
            setOpen(false)
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
