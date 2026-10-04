import { formatDueDate } from "./chores"
import { addCivilDays, getHourInTimeZone, toCivilDate } from "./timezone"
import type { DateFormat } from "./preferences"

/** Chores due within this many days of today are listed in the digest. */
export const DIGEST_WINDOW_DAYS = 7

export type DigestChore = {
  name: string
  roomName: string
  dueDate: Date
  daysUntilDue: number
  cadence: string
  lastDoneBy: string | null
}

export type DigestEmail = {
  subject: string
  html: string
  text: string
}

/** `"YYYY-MM-DD"` of a civil date; compares correctly as a string. */
export function toDateKey(civilDate: Date): string {
  return civilDate.toISOString().slice(0, 10)
}

export function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`
}

/**
 * The most recent scheduled digest slot at or before `now`, as a civil date in
 * `timeZone`. `day` is 0 = Sunday … 6 = Saturday, `hour` is the local hour.
 *
 * Civil days are compared on the UTC axis, so DST transitions shift the local
 * clock hour but never the day arithmetic.
 */
export function getScheduledDigestDay(
  now: Date,
  timeZone: string,
  day: number,
  hour: number
): Date {
  const today = toCivilDate(now, timeZone)
  // A UTC-midnight civil date's UTC weekday is the local weekday of that day.
  let delta = (today.getUTCDay() - day + 7) % 7
  if (delta === 0 && getHourInTimeZone(now, timeZone) < hour) {
    delta = 7
  }
  return addCivilDays(today, -delta)
}

/**
 * Whether household should be sent a digest now, and which slot that send
 * would consume. `scheduledOn` is returned even when `due` is false so callers
 * can mark skipped slots as consumed.
 */
export function isDigestDue(input: {
  now: Date
  timeZone: string
  day: number
  hour: number
  lastSentOn: string | null
}): { due: boolean; scheduledOn: string } {
  const scheduledOn = toDateKey(
    getScheduledDigestDay(input.now, input.timeZone, input.day, input.hour)
  )
  return {
    due: input.lastSentOn === null || input.lastSentOn < scheduledOn,
    scheduledOn,
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/** Badge wording shared with the dashboard chore row. */
export function describeDigestDue(
  daysUntilDue: number,
  dueDate: Date,
  now: Date,
  timeZone: string,
  dateFormat: DateFormat
): string {
  const label = formatDueDate(dueDate, now, timeZone, dateFormat)
  if (daysUntilDue < 0) return `Overdue · ${label}`
  if (daysUntilDue === 0) return "Due today"
  return `Due ${label}`
}

/** Groups chores by room, preserving first-seen room order. */
function groupByRoom(chores: DigestChore[]): Array<[string, DigestChore[]]> {
  const groups: Array<[string, DigestChore[]]> = []
  for (const chore of chores) {
    const group = groups.find(([roomName]) => roomName === chore.roomName)
    if (group) group[1].push(chore)
    else groups.push([chore.roomName, [chore]])
  }
  return groups
}

export function buildDigest(input: {
  householdName: string
  appUrl: string
  now: Date
  timeZone: string
  dateFormat: DateFormat
  chores: DigestChore[]
}): DigestEmail {
  const { householdName, appUrl, now, timeZone, dateFormat, chores } = input
  const overdue = chores.filter((chore) => chore.daysUntilDue < 0)
  const due = chores.filter((chore) => chore.daysUntilDue >= 0)

  const subject =
    chores.length === 0
      ? `${householdName}: nothing due this week`
      : overdue.length === 0
        ? `${householdName}: ${pluralize(due.length, "chore")} due this week`
        : due.length === 0
          ? `${householdName}: ${pluralize(overdue.length, "chore")} overdue`
          : `${householdName}: ${pluralize(overdue.length, "chore")} overdue, ${pluralize(due.length, "chore")} due`

  const summary =
    chores.length === 0
      ? "Nothing is due in the next 7 days."
      : overdue.length === 0
        ? `${pluralize(due.length, "chore")} due in the next 7 days.`
        : due.length === 0
          ? `${pluralize(overdue.length, "chore")} overdue.`
          : `${pluralize(overdue.length, "chore")} overdue and ${pluralize(due.length, "chore")} due in the next 7 days.`

  const todayLabel = formatDueDate(toCivilDate(now, timeZone), now, timeZone, dateFormat)
  const windowLabel = `Chores due in the 7 days from ${todayLabel}`
  const dashboardUrl = `${appUrl}/dashboard`

  const prepared = groupByRoom(chores).map(([roomName, roomChores]) => ({
    roomName,
    items: roomChores.map((chore) => ({
      name: chore.name,
      dueLabel: describeDigestDue(chore.daysUntilDue, chore.dueDate, now, timeZone, dateFormat),
      meta: chore.lastDoneBy
        ? `${chore.cadence} · Last done by ${chore.lastDoneBy}`
        : chore.cadence,
    })),
  }))

  const roomSections = prepared
    .map(({ roomName, items }) => {
      const listItems = items
        .map(
          (item) =>
            `<li><strong>${escapeHtml(item.name)}</strong> — ${escapeHtml(item.dueLabel)}<br><span>${escapeHtml(item.meta)}</span></li>`
        )
        .join("")
      return `<h2>${escapeHtml(roomName)}</h2><ul>${listItems}</ul>`
    })
    .join("")

  const html = `<!doctype html><html lang="en"><body style="margin:0;padding:24px;background:#ffffff;color:#111111;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;line-height:1.5"><h1 style="margin:0 0 8px;font-size:20px">${escapeHtml(householdName)}</h1><p style="margin:0 0 4px;color:#555555;font-size:14px">${escapeHtml(windowLabel)}</p><p style="margin:0 0 16px;font-size:14px">${escapeHtml(summary)}</p>${roomSections}<p style="margin:24px 0 0;font-size:14px"><a href="${dashboardUrl}">Open the dashboard</a></p></body></html>`

  const textLines = [householdName, windowLabel, summary, ""]
  for (const { roomName, items } of prepared) {
    textLines.push(roomName)
    for (const item of items) {
      textLines.push(`  - ${item.name} — ${item.dueLabel} (${item.meta})`)
    }
  }
  textLines.push("", `Open the dashboard: ${dashboardUrl}`)

  return { subject, html, text: textLines.join("\n") }
}
