"use client"

import type { KeyboardEvent } from "react"
import { Input } from "@/components/ui/input"
import { WEEKDAY_NAMES, type Recurrence } from "@/lib/chores"

const selectClassName =
  "h-8 shrink-0 rounded-lg border border-border bg-transparent px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"

type RecurrenceFieldsProps = {
  recurrence: Recurrence
  onRecurrenceChange: (value: Recurrence) => void
  count: string
  onCountChange: (value: string) => void
  weekday: string
  onWeekdayChange: (value: string) => void
  monthDay: string
  onMonthDayChange: (value: string) => void
  onEnter: () => void
  onEscape: () => void
  disabled?: boolean
}

export function RecurrenceFields({
  recurrence,
  onRecurrenceChange,
  count,
  onCountChange,
  weekday,
  onWeekdayChange,
  monthDay,
  onMonthDayChange,
  onEnter,
  onEscape,
  disabled,
}: RecurrenceFieldsProps) {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") onEnter()
    if (e.key === "Escape") onEscape()
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <select
        className={selectClassName}
        value={recurrence}
        onChange={(e) => onRecurrenceChange(e.target.value as Recurrence)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      >
        <option value="days">Days</option>
        <option value="weekly">Weeks</option>
        <option value="monthly">Months</option>
      </select>
      <span className="shrink-0 text-xs text-muted-foreground">every</span>
      <Input
        className="w-16 text-center"
        type="number"
        min="1"
        value={count}
        onChange={(e) => onCountChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />
      <span className="shrink-0 text-xs text-muted-foreground">
        {recurrence === "days"
          ? "days"
          : recurrence === "weekly"
            ? "weeks"
            : "months"}
      </span>
      {recurrence === "weekly" && (
        <select
          className={selectClassName}
          value={weekday}
          onChange={(e) => onWeekdayChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        >
          {WEEKDAY_NAMES.map((name, index) => (
            <option key={name} value={String(index)}>
              {name}
            </option>
          ))}
        </select>
      )}
      {recurrence === "monthly" && (
        <>
          <Input
            className="w-16 text-center"
            type="number"
            min="1"
            max="31"
            value={monthDay}
            onChange={(e) => onMonthDayChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />
          <span className="shrink-0 text-xs text-muted-foreground">
            of the month
          </span>
        </>
      )}
    </div>
  )
}
