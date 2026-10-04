const MS_PER_DAY = 86_400_000

/**
 * Resolves the calendar date (Y-M-D) an instant falls on in the given IANA
 * timezone. Month is 1-12.
 */
export function getDatePartsInTimeZone(
  instant: Date,
  timeZone: string
): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant)

  const year = parts.find((part) => part.type === "year")?.value
  const month = parts.find((part) => part.type === "month")?.value
  const day = parts.find((part) => part.type === "day")?.value

  if (!year || !month || !day) {
    throw new Error("Failed to resolve date parts")
  }

  const yearNumber = Number(year)
  const monthNumber = Number(month)
  const dayNumber = Number(day)

  if (
    !Number.isInteger(yearNumber) ||
    !Number.isInteger(monthNumber) ||
    !Number.isInteger(dayNumber)
  ) {
    throw new Error("Failed to resolve date parts")
  }

  return { year: yearNumber, month: monthNumber, day: dayNumber }
}

/**
 * Converts an instant to the civil date (UTC midnight) of the day it falls on
 * in the given timezone. The result is a `Date` whose Y-M-D is meaningful and
 * whose time is always 00:00:00.000Z; never treat it as an instant.
 */
export function toCivilDate(instant: Date, timeZone: string): Date {
  const { year, month, day } = getDatePartsInTimeZone(instant, timeZone)
  return new Date(Date.UTC(year, month - 1, day))
}

const hourFormatters = new Map<string, Intl.DateTimeFormat>()

function getHourFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = hourFormatters.get(timeZone)
  if (!formatter) {
    // `h23` (not `hour12: false`) because ICU can emit "24" for midnight.
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      hourCycle: "h23",
    })
    hourFormatters.set(timeZone, formatter)
  }
  return formatter
}

/** Hour of day (0-23) the instant falls on in the given IANA timezone. */
export function getHourInTimeZone(instant: Date, timeZone: string): number {
  const value = getHourFormatter(timeZone)
    .formatToParts(instant)
    .find((part) => part.type === "hour")?.value
  if (!value) return 0
  const hour = parseInt(value, 10)
  return Number.isNaN(hour) ? 0 : hour
}

/**
 * Adds whole civil days to a civil date. Safe because the input is always at
 * UTC midnight, so there is no DST transition on the UTC axis.
 */
export function addCivilDays(civilDate: Date, days: number): Date {
  return new Date(civilDate.getTime() + days * MS_PER_DAY)
}

/** Signed number of civil days from `from` to `to` (`to - from`). */
export function civilDaysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY)
}

export function isValidTimeZone(timeZone: string): boolean {
  if (typeof timeZone !== "string" || timeZone.length === 0) return false
  try {
    new Intl.DateTimeFormat("en-US", { timeZone })
    return true
  } catch {
    return false
  }
}

export function getBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  } catch {
    return "UTC"
  }
}

/**
 * Canonical IANA list for timezone pickers, with `UTC` prepended
 * (`Intl.supportedValuesOf` omits it) and each zone's current UTC offset label.
 * Computed on the server so the rendered list is identical on both sides of
 * hydration.
 */
export function getTimeZoneOptions(at: Date = new Date()): TimeZoneOption[] {
  let zones: string[]
  try {
    zones = ["UTC", ...Intl.supportedValuesOf("timeZone")]
  } catch {
    zones = ["UTC"]
  }
  return zones.map((timeZone) => ({
    timeZone,
    offsetLabel: getTimeZoneOffsetLabel(timeZone, at),
  }))
}

export type TimeZoneOption = {
  timeZone: string
  offsetLabel: string
}

/** Current UTC offset of `timeZone`, e.g. `UTC+05:30` / `UTC-04:00`. */
export function getTimeZoneOffsetLabel(
  timeZone: string,
  at: Date = new Date()
): string {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  })
    .formatToParts(at)
    .find((part) => part.type === "timeZoneName")?.value

  if (!name) return ""
  // longOffset yields "GMT" for zero offset and "GMT±HH:MM" otherwise.
  return name === "GMT" ? "UTC+00:00" : name.replace(/^GMT/, "UTC")
}

function normalizeZoneText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function isSubsequence(needle: string, haystack: string): boolean {
  let index = 0
  for (const char of haystack) {
    if (char === needle[index]) index++
    if (index === needle.length) return true
  }
  return needle.length === 0
}

/**
 * Fuzzy-matches zones against a query, best match first: exact, then prefix,
 * then substring, then in-order subsequence. Separators are ignored, so
 * `new york`, `newyork` and `New_York` all match `America/New_York`.
 */
export function matchTimeZoneOptions(
  options: TimeZoneOption[],
  query: string
): TimeZoneOption[] {
  const needle = normalizeZoneText(query)
  if (!needle) return options

  const ranked: Array<{ rank: number; option: TimeZoneOption }> = []
  for (const option of options) {
    const haystack = normalizeZoneText(option.timeZone)
    const rank =
      haystack === needle
        ? 0
        : haystack.startsWith(needle)
          ? 1
          : haystack.includes(needle)
            ? 2
            : isSubsequence(needle, haystack)
              ? 3
              : -1
    if (rank >= 0) ranked.push({ rank, option })
  }

  ranked.sort(
    (a, b) =>
      a.rank - b.rank || a.option.timeZone.localeCompare(b.option.timeZone)
  )
  return ranked.map((entry) => entry.option)
}

/** Civil days from the day of `instant` to the day of `now`. */
export function getDaysAgo(
  instant: Date,
  now: Date,
  timeZone: string
): number {
  return civilDaysBetween(
    toCivilDate(instant, timeZone),
    toCivilDate(now, timeZone)
  )
}
