import { addCivilDays, civilDaysBetween, toCivilDate } from "./timezone"
import type { DateFormat } from "./preferences"

export type LastCompletion = {
  completedAt: Date
}

export type Recurrence = "days" | "weekly" | "monthly"

export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const

export type ChoreBase = {
  createdAt: Date
  intervalDays: number
  recurrence: Recurrence
  recurrenceInterval: number
  recurrenceWeekday: number
  recurrenceMonthDay: number
}

/** Days in a 1-based `month` of a civil `year`. */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/**
 * Returns the civil date a chore is due, as a `Date` at UTC midnight whose
 * Y-M-D is the local due day in `timeZone`.
 *
 * The base day is the last completion's local civil day, else the chore
 * creation's local civil day. The due day is always strictly after the base
 * day:
 * - `days`: base + `intervalDays`.
 * - `weekly`: the next `recurrenceWeekday`, then every `recurrenceInterval`
 *   weeks after that.
 * - `monthly`: the first `recurrenceMonthDay` on or after the base day in a
 *   month `> base` (the base month counts when that day is still ahead), then
 *   every `recurrenceInterval` months; a day missing from the target month
 *   clamps to that month's last day.
 */
export function getDueDate(
  chore: ChoreBase,
  lastCompletion: LastCompletion | null,
  timeZone: string
): Date {
  const base = lastCompletion
    ? toCivilDate(lastCompletion.completedAt, timeZone)
    : toCivilDate(chore.createdAt, timeZone)

  if (chore.recurrence === "weekly") {
    const delta = (chore.recurrenceWeekday - base.getUTCDay() + 7) % 7
    const daysToFirst = delta === 0 ? 7 : delta
    return addCivilDays(base, daysToFirst + 7 * (chore.recurrenceInterval - 1))
  }

  if (chore.recurrence === "monthly") {
    let year = base.getUTCFullYear()
    let month = base.getUTCMonth()
    for (let i = 0; i < 240; i += 1) {
      const day = Math.min(chore.recurrenceMonthDay, daysInMonth(year, month + 1))
      const candidate = new Date(Date.UTC(year, month, day))
      if (candidate.getTime() > base.getTime()) return candidate
      month += chore.recurrenceInterval
      year += Math.floor(month / 12)
      month %= 12
    }
    throw new Error("Failed to resolve monthly due date")
  }

  return addCivilDays(base, chore.intervalDays)
}

/**
 * Returns whole civil days from today's local date to `dueDate` in `timeZone`.
 * Negative when overdue, 0 when due today.
 */
export function getDaysUntilDue(
  dueDate: Date,
  now: Date,
  timeZone: string
): number {
  return civilDaysBetween(toCivilDate(now, timeZone), dueDate)
}

/**
 * Returns how many civil days `dueDate` is past today's local date in
 * `timeZone`. Returns 0 if not overdue.
 */
export function getOverdueDays(
  dueDate: Date,
  now: Date,
  timeZone: string
): number {
  return Math.max(0, -getDaysUntilDue(dueDate, now, timeZone))
}

export type ChoreRecurrence = {
  recurrence: Recurrence
  intervalDays: number
  recurrenceInterval: number
  recurrenceWeekday: number
  recurrenceMonthDay: number
}

const MAX_INTERVAL = 1000

/**
 * Validates UI recurrence input and normalizes unused fields to their column
 * defaults. Throws an Error whose message is safe to show to the user.
 */
export function normalizeRecurrence(input: {
  recurrence: string
  count: number
  weekday: number
  monthDay: number
}): ChoreRecurrence {
  if (
    input.recurrence !== "days" &&
    input.recurrence !== "weekly" &&
    input.recurrence !== "monthly"
  ) {
    throw new Error("Invalid recurrence")
  }
  if (
    !Number.isInteger(input.count) ||
    input.count < 1 ||
    input.count > MAX_INTERVAL
  ) {
    throw new Error("Enter a valid interval")
  }
  if (input.recurrence === "days") {
    return {
      recurrence: "days",
      intervalDays: input.count,
      recurrenceInterval: 1,
      recurrenceWeekday: 0,
      recurrenceMonthDay: 1,
    }
  }
  if (input.recurrence === "weekly") {
    if (!Number.isInteger(input.weekday) || input.weekday < 0 || input.weekday > 6) {
      throw new Error("Choose a weekday")
    }
    return {
      recurrence: "weekly",
      intervalDays: 1,
      recurrenceInterval: input.count,
      recurrenceWeekday: input.weekday,
      recurrenceMonthDay: 1,
    }
  }
  if (!Number.isInteger(input.monthDay) || input.monthDay < 1 || input.monthDay > 31) {
    throw new Error("Choose a day of the month")
  }
  return {
    recurrence: "monthly",
    intervalDays: 1,
    recurrenceInterval: input.count,
    recurrenceWeekday: 0,
    recurrenceMonthDay: input.monthDay,
  }
}

function ordinal(value: number): string {
  const tens = value % 100
  if (tens >= 11 && tens <= 13) return `${value}th`
  switch (value % 10) {
    case 1:
      return `${value}st`
    case 2:
      return `${value}nd`
    case 3:
      return `${value}rd`
    default:
      return `${value}th`
  }
}

/** Human label for a chore's cadence, e.g. "Every 2 weeks on Saturday". */
export function describeRecurrence(chore: ChoreRecurrence): string {
  if (chore.recurrence === "weekly") {
    const weekday = WEEKDAY_NAMES[chore.recurrenceWeekday]
    return chore.recurrenceInterval === 1
      ? `Every ${weekday}`
      : `Every ${chore.recurrenceInterval} weeks on ${weekday}`
  }
  if (chore.recurrence === "monthly") {
    const day = ordinal(chore.recurrenceMonthDay)
    return chore.recurrenceInterval === 1
      ? `Every month on the ${day}`
      : `Every ${chore.recurrenceInterval} months on the ${day}`
  }
  return chore.intervalDays === 1 ? "Every day" : `Every ${chore.intervalDays} days`
}

const MEAN_MONTH_DAYS = 365.2425 / 12

/**
 * Nominal days between occurrences; the history cadence target. Weeks are
 * exact; a month is the mean Gregorian month (365.2425 / 12), so a punctual
 * monthly chore does not read as perpetually late.
 */
export function getTargetDays(chore: ChoreRecurrence): number {
  if (chore.recurrence === "weekly") return 7 * chore.recurrenceInterval
  if (chore.recurrence === "monthly") return MEAN_MONTH_DAYS * chore.recurrenceInterval
  return chore.intervalDays
}

export type DueBucket = "overdue" | "today" | "week" | "later"

/** Bucket for a due date relative to the household's local today. */
export function getDueBucket(
  dueDate: Date,
  now: Date,
  timeZone: string
): DueBucket {
  const days = getDaysUntilDue(dueDate, now, timeZone)
  if (days < 0) return "overdue"
  if (days === 0) return "today"
  if (days <= 7) return "week"
  return "later"
}

// `en-AU` renders day-month with a consistent comma ("Fri, 2 Oct" / "Sat, 2 Oct
// 2027"); `en-GB` omits the comma unless a year is present.
const dueDateFormatters: Record<DateFormat, Intl.DateTimeFormat> = {
  mdy: new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }),
  dmy: new Intl.DateTimeFormat("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }),
}

const dueDateWithYearFormatters: Record<DateFormat, Intl.DateTimeFormat> = {
  mdy: new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }),
  dmy: new Intl.DateTimeFormat("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }),
}

/** "Sat, Oct 3" / "Sat, 3 Oct"; appends the year when it differs from `now`'s local year. */
export function formatDueDate(
  dueDate: Date,
  now: Date,
  timeZone: string,
  dateFormat: DateFormat
): string {
  const currentYear = toCivilDate(now, timeZone).getUTCFullYear()
  return dueDate.getUTCFullYear() === currentYear
    ? dueDateFormatters[dateFormat].format(dueDate)
    : dueDateWithYearFormatters[dateFormat].format(dueDate)
}
