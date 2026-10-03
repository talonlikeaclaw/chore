import {
  addCivilDays,
  civilDaysBetween,
  getDaysAgo,
  toCivilDate,
} from "./timezone"
import { getTargetDays, type Recurrence } from "./chores"

export type CompletionEntry = {
  id: string
  completedAt: Date
  choreId: string
  choreName: string
  intervalDays: number
  recurrence: Recurrence
  recurrenceInterval: number
  recurrenceWeekday: number
  recurrenceMonthDay: number
  roomId: string
  roomName: string
  userId: string
  userName: string
}

export type HistoryMember = { userId: string; name: string }

export type HistoryTotals = {
  total: number
  last7Days: number
  last30Days: number
}

/** Lifetime, 7-day and 30-day completion counts, counted in civil days. */
export function getHistoryTotals(
  entries: CompletionEntry[],
  now: Date,
  timeZone: string
): HistoryTotals {
  let last7Days = 0
  let last30Days = 0

  for (const entry of entries) {
    const daysAgo = getDaysAgo(entry.completedAt, now, timeZone)
    if (daysAgo < 7) last7Days += 1
    if (daysAgo < 30) last30Days += 1
  }

  return { total: entries.length, last7Days, last30Days }
}

export type MemberTotal = { userId: string; name: string; count: number }

/**
 * One row per household member (zero counts included), plus a row for any
 * completer no longer in the household, so the counts always sum to the total.
 */
export function getMemberTotals(
  entries: CompletionEntry[],
  members: HistoryMember[]
): MemberTotal[] {
  const totals = new Map<string, MemberTotal>()
  for (const member of members) {
    totals.set(member.userId, {
      userId: member.userId,
      name: member.name,
      count: 0,
    })
  }

  for (const entry of entries) {
    const existing = totals.get(entry.userId)
    if (existing) {
      existing.count += 1
    } else {
      totals.set(entry.userId, {
        userId: entry.userId,
        name: entry.userName,
        count: 1,
      })
    }
  }

  return [...totals.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name)
  )
}

export type RoomTotal = { roomId: string; name: string; count: number }

/** Rooms with at least one completion, most completions first. */
export function getRoomTotals(entries: CompletionEntry[]): RoomTotal[] {
  const totals = new Map<string, RoomTotal>()

  for (const entry of entries) {
    const existing = totals.get(entry.roomId)
    if (existing) {
      existing.count += 1
    } else {
      totals.set(entry.roomId, {
        roomId: entry.roomId,
        name: entry.roomName,
        count: 1,
      })
    }
  }

  return [...totals.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name)
  )
}

export type CadenceRow = {
  choreId: string
  choreName: string
  roomName: string
  intervalDays: number
  recurrence: Recurrence
  recurrenceInterval: number
  recurrenceWeekday: number
  recurrenceMonthDay: number
  targetDays: number
  actualDays: number
  deltaDays: number
}

/** How far apart a chore is actually done, in words. */
export type CadenceVerdict = {
  state: "on-schedule" | "early" | "late"
  label: string
}

/** Half a day either way is noise on a short cadence… */
const CADENCE_MIN_TOLERANCE_DAYS = 0.5
/** …and 5% of the target on a long one, so a 31-day month reads on schedule. */
const CADENCE_TOLERANCE_RATIO = 0.05

/** Plain-language verdict for one cadence row. */
export function getCadenceVerdict(
  row: Pick<CadenceRow, "actualDays" | "targetDays">
): CadenceVerdict {
  const delta = row.actualDays - row.targetDays
  const tolerance = Math.max(
    CADENCE_MIN_TOLERANCE_DAYS,
    row.targetDays * CADENCE_TOLERANCE_RATIO
  )
  if (Math.abs(delta) < tolerance) {
    return { state: "on-schedule", label: "On schedule" }
  }
  const days = Math.round(Math.abs(delta))
  const unit = days === 1 ? "day" : "days"
  return delta < 0
    ? { state: "early", label: `${days} ${unit} early` }
    : { state: "late", label: `${days} ${unit} late` }
}

/** "usually 13 days apart" — 1 decimal only when the mean is not whole. */
export function describeCadenceInterval(days: number): string {
  const whole = Math.round(days)
  const isWhole = Math.abs(days - whole) < 0.05
  const text = isWhole ? String(whole) : days.toFixed(1)
  const unit = isWhole && whole === 1 ? "day" : "days"
  return `usually ${text} ${unit} apart`
}

/**
 * Actual vs. target interval per chore, over chores with at least two
 * completions. The actual interval is the mean civil-day gap between
 * consecutive completions, so DST never skews it. Rows are sorted by how far
 * actual lags target (largest first).
 */
export function getCadence(
  entries: CompletionEntry[],
  timeZone: string
): CadenceRow[] {
  const byChore = new Map<string, CompletionEntry[]>()
  for (const entry of entries) {
    const group = byChore.get(entry.choreId)
    if (group) {
      group.push(entry)
    } else {
      byChore.set(entry.choreId, [entry])
    }
  }

  const rows: CadenceRow[] = []

  for (const group of byChore.values()) {
    if (group.length < 2) continue

    group.sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime())

    let totalDays = 0
    for (let i = 1; i < group.length; i += 1) {
      totalDays += civilDaysBetween(
        toCivilDate(group[i - 1].completedAt, timeZone),
        toCivilDate(group[i].completedAt, timeZone)
      )
    }

    const actualDays = totalDays / (group.length - 1)
    const targetDays = getTargetDays(group[0])
    rows.push({
      choreId: group[0].choreId,
      choreName: group[0].choreName,
      roomName: group[0].roomName,
      intervalDays: group[0].intervalDays,
      recurrence: group[0].recurrence,
      recurrenceInterval: group[0].recurrenceInterval,
      recurrenceWeekday: group[0].recurrenceWeekday,
      recurrenceMonthDay: group[0].recurrenceMonthDay,
      targetDays,
      actualDays,
      deltaDays: actualDays - targetDays,
    })
  }

  return rows.sort(
    (a, b) => b.deltaDays - a.deltaDays || a.choreName.localeCompare(b.choreName)
  )
}

export type WeekBucket = {
  start: Date
  label: string
  count: number
  ratio: number
}

/** Monday-start week of a civil date. */
function getWeekStart(civilDate: Date): Date {
  return addCivilDays(civilDate, -((civilDate.getUTCDay() + 6) % 7))
}

const weekLabelFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})

/**
 * Completion counts for the last `weeks` Monday-start weeks, oldest first,
 * ending with the week containing `now`.
 */
export function getWeeklyTrend(
  entries: CompletionEntry[],
  now: Date,
  timeZone: string,
  weeks = 8
): WeekBucket[] {
  const currentWeekStart = getWeekStart(toCivilDate(now, timeZone))
  const starts: Date[] = []
  for (let i = weeks - 1; i >= 0; i -= 1) {
    starts.push(addCivilDays(currentWeekStart, -7 * i))
  }

  const counts = starts.map(() => 0)
  const indexByStart = new Map(starts.map((start, index) => [start.getTime(), index]))

  for (const entry of entries) {
    const weekStart = getWeekStart(toCivilDate(entry.completedAt, timeZone))
    const index = indexByStart.get(weekStart.getTime())
    if (index !== undefined) counts[index] += 1
  }

  const maxCount = Math.max(...counts, 0)
  const lastIndex = starts.length - 1

  return starts.map((start, index) => ({
    start,
    label: index === lastIndex ? "This week" : weekLabelFormatter.format(start),
    count: counts[index],
    ratio: counts[index] / Math.max(1, maxCount),
  }))
}

export type LogEntry = {
  id: string
  timeLabel: string
  choreName: string
  roomName: string
  userName: string
}

export type LogGroup = { key: string; label: string; entries: LogEntry[] }

const logDayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})

/**
 * Groups the most recent completions (expected newest first) into
 * household-local days, capped at `limit`.
 */
export function getHistoryLog(
  entries: CompletionEntry[],
  now: Date,
  timeZone: string,
  limit = 100
): { groups: LogGroup[]; truncated: boolean; total: number } {
  const total = entries.length
  const currentYear = toCivilDate(now, timeZone).getUTCFullYear()
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  })

  const groups: LogGroup[] = []
  const groupByKey = new Map<string, LogGroup>()

  for (const entry of entries.slice(0, limit)) {
    const civilDate = toCivilDate(entry.completedAt, timeZone)
    const key = civilDate.toISOString().slice(0, 10)

    let group = groupByKey.get(key)
    if (!group) {
      const daysAgo = getDaysAgo(entry.completedAt, now, timeZone)
      let label: string
      if (daysAgo === 0) {
        label = "Today"
      } else if (daysAgo === 1) {
        label = "Yesterday"
      } else {
        label = logDayFormatter.format(civilDate)
        if (civilDate.getUTCFullYear() !== currentYear) {
          label += `, ${civilDate.getUTCFullYear()}`
        }
      }

      group = { key, label, entries: [] }
      groupByKey.set(key, group)
      groups.push(group)
    }

    group.entries.push({
      id: entry.id,
      timeLabel: timeFormatter.format(entry.completedAt),
      choreName: entry.choreName,
      roomName: entry.roomName,
      userName: entry.userName,
    })
  }

  return { groups, truncated: total > limit, total }
}
