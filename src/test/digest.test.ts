import { describe, expect, it } from "vitest"
import {
  buildDigest,
  escapeHtml,
  getScheduledDigestDay,
  isDigestDue,
  pluralize,
  toDateKey,
  type DigestChore,
} from "@/lib/digest"

describe("toDateKey", () => {
  it("formats a civil date as YYYY-MM-DD", () => {
    expect(toDateKey(new Date("2026-03-10T00:00:00Z"))).toBe("2026-03-10")
  })
})

describe("pluralize", () => {
  it("keeps the singular for one", () => {
    expect(pluralize(1, "chore")).toBe("1 chore")
  })

  it("pluralizes for many", () => {
    expect(pluralize(3, "chore")).toBe("3 chores")
  })
})

describe("escapeHtml", () => {
  it("escapes every HTML-significant character", () => {
    expect(escapeHtml("<b>&\"'")).toBe("&lt;b&gt;&amp;&quot;&#39;")
  })
})

describe("getScheduledDigestDay", () => {
  const monday = { day: 1, hour: 8, timeZone: "UTC" }

  it("rolls back a week when today is the right weekday but the hour has not arrived", () => {
    // Monday 2026-03-09 06:00 UTC.
    expect(
      getScheduledDigestDay(new Date("2026-03-09T06:00:00Z"), "UTC", monday.day, monday.hour)
    ).toEqual(new Date("2026-03-02T00:00:00Z"))
  })

  it("returns today once the hour has arrived", () => {
    // Monday 2026-03-09 09:00 UTC.
    expect(
      getScheduledDigestDay(new Date("2026-03-09T09:00:00Z"), "UTC", monday.day, monday.hour)
    ).toEqual(new Date("2026-03-09T00:00:00Z"))
  })

  it("returns the most recent matching weekday", () => {
    // Thursday 2026-03-12 12:00 UTC → Monday 2026-03-09.
    expect(
      getScheduledDigestDay(new Date("2026-03-12T12:00:00Z"), "UTC", monday.day, monday.hour)
    ).toEqual(new Date("2026-03-09T00:00:00Z"))
  })

  it("is DST-safe across the fall-back day", () => {
    const sunday = { day: 0, hour: 8, timeZone: "America/New_York" }

    // 2026-11-01 13:00Z is 08:00 EST (fall-back day, 25 hours long).
    expect(
      getScheduledDigestDay(
        new Date("2026-11-01T13:00:00Z"),
        sunday.timeZone,
        sunday.day,
        sunday.hour
      )
    ).toEqual(new Date("2026-11-01T00:00:00Z"))

    // 2026-11-01 12:00Z is 07:00 EST → the previous Sunday.
    expect(
      getScheduledDigestDay(
        new Date("2026-11-01T12:00:00Z"),
        sunday.timeZone,
        sunday.day,
        sunday.hour
      )
    ).toEqual(new Date("2026-10-25T00:00:00Z"))
  })
})

describe("isDigestDue", () => {
  const base = { now: new Date("2026-03-09T09:00:00Z"), timeZone: "UTC", day: 1, hour: 8 }

  it("is due when nothing has been sent", () => {
    expect(isDigestDue({ ...base, lastSentOn: null })).toEqual({
      due: true,
      scheduledOn: "2026-03-09",
    })
  })

  it("is not due once the slot was consumed", () => {
    expect(isDigestDue({ ...base, lastSentOn: "2026-03-09" }).due).toBe(false)
  })

  it("is due again after a week", () => {
    expect(isDigestDue({ ...base, lastSentOn: "2026-03-08" }).due).toBe(true)
  })
})

const now = new Date("2026-03-10T12:00:00Z")

function chore(overrides: Partial<DigestChore>): DigestChore {
  return {
    name: "Vacuum",
    roomName: "Kitchen",
    dueDate: new Date("2026-03-10T00:00:00Z"),
    daysUntilDue: 0,
    cadence: "Every 7 days",
    lastDoneBy: null,
    ...overrides,
  }
}

function build(chores: DigestChore[], householdName = "Home") {
  return buildDigest({
    householdName,
    appUrl: "http://localhost:3000",
    now,
    timeZone: "UTC",
    dateFormat: "mdy",
    chores,
  })
}

describe("buildDigest", () => {
  it("counts overdue and upcoming chores in the subject and body", () => {
    const email = build([
      chore({
        name: "Dishes",
        dueDate: new Date("2026-03-08T00:00:00Z"),
        daysUntilDue: -2,
        lastDoneBy: "Sam",
      }),
      chore({ name: "Vacuum" }),
    ])

    expect(email.subject).toBe("Home: 1 chore overdue, 1 chore due")
    expect(email.text).toContain("1 chore overdue and 1 chore due in the next 7 days.")
    expect(email.text).toContain("Dishes")
    expect(email.text).toContain("Vacuum")
    expect(email.text).toContain("Overdue · Sun, Mar 8")
    expect(email.text).toContain("Due today")
    expect(email.text).toContain("Every 7 days · Last done by Sam")
    expect(email.html).toContain("Overdue · Sun, Mar 8")
    expect(email.html).toContain("Due today")
  })

  it("escapes HTML in the html part but not in the text part", () => {
    const email = build([chore({ name: "<b>Dishes</b>", roomName: "<i>Kitchen</i>" })])

    expect(email.html).toContain("&lt;b&gt;Dishes&lt;/b&gt;")
    expect(email.html).toContain("&lt;i&gt;Kitchen&lt;/i&gt;")
    expect(email.html).not.toContain("<b>Dishes</b>")
    expect(email.text).toContain("<b>Dishes</b>")
  })

  it("says nothing is due when the window is empty", () => {
    const email = build([])

    expect(email.subject).toBe("Home: nothing due this week")
    expect(email.text).toContain("Nothing is due in the next 7 days.")
    expect(email.html).toContain("Nothing is due in the next 7 days.")
  })

  it("links to the dashboard", () => {
    const email = build([chore({})])

    expect(email.html).toContain('href="http://localhost:3000/dashboard"')
    expect(email.text).toContain("Open the dashboard: http://localhost:3000/dashboard")
  })

  it("groups chores under their room heading", () => {
    const email = build([
      chore({ name: "Vacuum", roomName: "Kitchen" }),
      chore({ name: "Scrub", roomName: "Bathroom" }),
    ])

    expect(email.html.indexOf("<h2>Kitchen</h2>")).toBeLessThan(
      email.html.indexOf("<h2>Bathroom</h2>")
    )
    expect(email.text).toContain("Kitchen")
    expect(email.text).toContain("Bathroom")
  })
})
