import { addCivilDays, civilDaysBetween, toCivilDate } from "./timezone"

export type LastCompletion = {
  completedAt: Date
}

export type ChoreBase = {
  createdAt: Date
  intervalDays: number
}

/**
 * Returns the civil date a chore is due, as a `Date` at UTC midnight whose
 * Y-M-D is the local due day in `timeZone`.
 *
 * Due day = calendar day of (last completion, else chore creation) in
 * `timeZone`, plus `intervalDays`.
 */
export function getDueDate(
  chore: ChoreBase,
  lastCompletion: LastCompletion | null,
  timeZone: string
): Date {
  const base = lastCompletion
    ? toCivilDate(lastCompletion.completedAt, timeZone)
    : toCivilDate(chore.createdAt, timeZone)
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
