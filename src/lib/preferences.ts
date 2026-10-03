export type HourCycle = "h12" | "h23"
export type DateFormat = "mdy" | "dmy"

export type HouseholdPreferences = {
  weekStartsOn: number
  hourCycle: HourCycle
  dateFormat: DateFormat
  defaultIntervalDays: number
}

export const MAX_DEFAULT_INTERVAL_DAYS = 1000

export const HOUR_CYCLE_OPTIONS: ReadonlyArray<{ value: HourCycle; label: string }> = [
  { value: "h23", label: "24-hour (14:05)" },
  { value: "h12", label: "12-hour (2:05 PM)" },
]

export const DATE_FORMAT_OPTIONS: ReadonlyArray<{ value: DateFormat; label: string }> = [
  { value: "mdy", label: "Month day (Oct 3)" },
  { value: "dmy", label: "Day month (3 Oct)" },
]

export function isValidHourCycle(value: string): value is HourCycle {
  return value === "h12" || value === "h23"
}

export function isValidDateFormat(value: string): value is DateFormat {
  return value === "mdy" || value === "dmy"
}

/**
 * Validates household preference input and returns the normalized value.
 * Throws an Error whose message is safe to show to the user.
 */
export function normalizeHouseholdPreferences(input: {
  weekStartsOn: number
  hourCycle: string
  dateFormat: string
  defaultIntervalDays: number
}): HouseholdPreferences {
  if (!Number.isInteger(input.weekStartsOn) || input.weekStartsOn < 0 || input.weekStartsOn > 6) {
    throw new Error("Choose a week start day")
  }
  if (!isValidHourCycle(input.hourCycle)) {
    throw new Error("Choose a time format")
  }
  if (!isValidDateFormat(input.dateFormat)) {
    throw new Error("Choose a date format")
  }
  if (
    !Number.isInteger(input.defaultIntervalDays) ||
    input.defaultIntervalDays < 1 ||
    input.defaultIntervalDays > MAX_DEFAULT_INTERVAL_DAYS
  ) {
    throw new Error("Enter a default interval between 1 and 1000 days")
  }
  return {
    weekStartsOn: input.weekStartsOn,
    hourCycle: input.hourCycle,
    dateFormat: input.dateFormat,
    defaultIntervalDays: input.defaultIntervalDays,
  }
}
