"use client"

import { useMemo, useState } from "react"
import { Autocomplete } from "@base-ui/react/autocomplete"
import { matchTimeZoneOptions, type TimeZoneOption } from "@/lib/timezone"

const MAX_ROWS = 50
const NO_ITEMS: TimeZoneOption[] = []

type TimeZoneComboboxProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  options: TimeZoneOption[]
  placeholder?: string
  disabled?: boolean
}

/**
 * Type-to-filter timezone picker. The input text is the value: it is only a
 * committed zone when it matches one exactly (callers validate with
 * `isValidTimeZone`).
 */
export function TimeZoneCombobox({
  id,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: TimeZoneComboboxProps) {
  const [highlightedZone, setHighlightedZone] = useState<string | null>(null)

  const isExactMatch = options.some((option) => option.timeZone === value)
  const matches = useMemo(
    () => matchTimeZoneOptions(options, value).slice(0, MAX_ROWS),
    [options, value]
  )
  const listVisible = value.length > 0 && !isExactMatch

  return (
    <Autocomplete.Root
      items={options}
      filteredItems={listVisible ? matches : NO_ITEMS}
      value={value}
      onValueChange={onChange}
      itemToStringValue={(option: TimeZoneOption) => option.timeZone}
      mode="list"
      onItemHighlighted={(option: TimeZoneOption | undefined) =>
        setHighlightedZone(option?.timeZone ?? null)
      }
    >
      <div className="relative">
        <Autocomplete.Input
          id={id}
          placeholder={placeholder}
          disabled={disabled}
          onKeyDown={(event) => {
            // Arrow keys highlight an item and Enter commits it; with no
            // highlight, Enter accepts the best match.
            if (event.key !== "Enter") return
            if (!listVisible || highlightedZone || matches.length === 0) return
            event.preventDefault()
            onChange(matches[0].timeZone)
          }}
          className="w-full rounded border border-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {listVisible && (
          <Autocomplete.List className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded border border-border bg-popover p-1 text-sm shadow-md">
            {matches.map((option) => (
              <Autocomplete.Item
                key={option.timeZone}
                value={option}
                onClick={() => onChange(option.timeZone)}
                className="flex cursor-default items-center justify-between gap-3 rounded px-2 py-1.5 data-[highlighted]:bg-muted"
              >
                <span>{option.timeZone}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {option.offsetLabel}
                </span>
              </Autocomplete.Item>
            ))}
          </Autocomplete.List>
        )}
      </div>
    </Autocomplete.Root>
  )
}
