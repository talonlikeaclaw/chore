import { describe, it, expect } from "vitest"
import { describeRecurrence } from "@/lib/chores"
import {
  describeCadenceInterval,
  getCadence,
  getCadenceVerdict,
  getHistoryLog,
  getHistoryTotals,
  getMemberTotals,
  getRoomTotals,
  getWeeklyTrend,
  type CompletionEntry,
} from "@/lib/history"

function makeEntry(
  id: string,
  completedAt: string,
  overrides: Partial<CompletionEntry> = {}
): CompletionEntry {
  return {
    id,
    completedAt: new Date(completedAt),
    choreId: "chore-1",
    choreName: "Wash dishes",
    intervalDays: 1,
    recurrence: "days",
    recurrenceInterval: 1,
    recurrenceWeekday: 0,
    recurrenceMonthDay: 1,
    roomId: "room-1",
    roomName: "Kitchen",
    userId: "user-1",
    userName: "Ann",
    ...overrides,
  }
}

describe("getHistoryTotals", () => {
  it("counts civil days in the household zone", () => {
    const entries = [
      // 2026-01-10T02:00Z is Jan 9 in New York.
      makeEntry("c1", "2026-01-10T02:00:00Z"),
      // 2026-01-04T03:00Z is Jan 3 in New York.
      makeEntry("c2", "2026-01-04T03:00:00Z"),
      makeEntry("c3", "2025-12-01T00:00:00Z"),
    ]

    expect(
      getHistoryTotals(entries, new Date("2026-01-10T12:00:00Z"), "America/New_York")
    ).toEqual({ total: 3, last7Days: 1, last30Days: 2 })
  })
})

describe("getMemberTotals", () => {
  it("keeps zero-count members and departures, sorted by count then name", () => {
    const members = [
      { userId: "a", name: "Ann" },
      { userId: "b", name: "Bob" },
    ]
    const entries = [
      makeEntry("c1", "2026-01-01T00:00:00Z", { userId: "a" }),
      makeEntry("c2", "2026-01-02T00:00:00Z", { userId: "a" }),
      makeEntry("c3", "2026-01-03T00:00:00Z", { userId: "c", userName: "Cara" }),
    ]

    expect(getMemberTotals(entries, members)).toEqual([
      { userId: "a", name: "Ann", count: 2 },
      { userId: "c", name: "Cara", count: 1 },
      { userId: "b", name: "Bob", count: 0 },
    ])
  })
})

describe("getRoomTotals", () => {
  it("lists only rooms with completions, busiest first", () => {
    const entries = [
      makeEntry("c1", "2026-01-01T00:00:00Z", { roomId: "r1", roomName: "Kitchen" }),
      makeEntry("c2", "2026-01-02T00:00:00Z", { roomId: "r1", roomName: "Kitchen" }),
      makeEntry("c3", "2026-01-03T00:00:00Z", { roomId: "r2", roomName: "Bathroom" }),
    ]

    expect(getRoomTotals(entries)).toEqual([
      { roomId: "r1", name: "Kitchen", count: 2 },
      { roomId: "r2", name: "Bathroom", count: 1 },
    ])
  })
})

describe("getCadence", () => {
  it("averages gaps between completions and ranks by lag, skipping single completions", () => {
    const entries = [
      makeEntry("x3", "2026-01-06T00:00:00Z", { choreId: "x", intervalDays: 3 }),
      makeEntry("x2", "2026-01-03T00:00:00Z", { choreId: "x", intervalDays: 3 }),
      makeEntry("x1", "2026-01-01T00:00:00Z", { choreId: "x", intervalDays: 3 }),
      makeEntry("y2", "2026-01-02T00:00:00Z", {
        choreId: "y",
        choreName: "Clean toilet",
        intervalDays: 1,
      }),
      makeEntry("y1", "2026-01-01T00:00:00Z", {
        choreId: "y",
        choreName: "Clean toilet",
        intervalDays: 1,
      }),
      makeEntry("z1", "2026-01-01T00:00:00Z", { choreId: "z", choreName: "Water plants" }),
    ]

    expect(getCadence(entries, "UTC")).toEqual([
      {
        choreId: "y",
        choreName: "Clean toilet",
        roomName: "Kitchen",
        intervalDays: 1,
        recurrence: "days",
        recurrenceInterval: 1,
        recurrenceWeekday: 0,
        recurrenceMonthDay: 1,
        targetDays: 1,
        actualDays: 1,
        deltaDays: 0,
      },
      {
        choreId: "x",
        choreName: "Wash dishes",
        roomName: "Kitchen",
        intervalDays: 3,
        recurrence: "days",
        recurrenceInterval: 1,
        recurrenceWeekday: 0,
        recurrenceMonthDay: 1,
        targetDays: 3,
        actualDays: 2.5,
        deltaDays: -0.5,
      },
    ])
  })

  it("counts civil days across a DST spring-forward, not elapsed hours", () => {
    const entries = [
      // Local Mar 9 00:00 (EDT) and local Mar 7 00:00 (EST) — 47 elapsed hours.
      makeEntry("d2", "2026-03-09T04:00:00Z", { choreId: "d", intervalDays: 2 }),
      makeEntry("d1", "2026-03-07T05:00:00Z", { choreId: "d", intervalDays: 2 }),
    ]

    expect(getCadence(entries, "America/New_York")).toEqual([
      {
        choreId: "d",
        choreName: "Wash dishes",
        roomName: "Kitchen",
        intervalDays: 2,
        recurrence: "days",
        recurrenceInterval: 1,
        recurrenceWeekday: 0,
        recurrenceMonthDay: 1,
        targetDays: 2,
        actualDays: 2,
        deltaDays: 0,
      },
    ])
  })
})

describe("getWeeklyTrend", () => {
  it("buckets completions into Monday-start weeks ending with the current one", () => {
    // 2026-01-10 is a Saturday, so the current week starts Monday Jan 5.
    const entries = [
      makeEntry("c1", "2026-01-06T00:00:00Z"),
      makeEntry("c2", "2025-12-31T00:00:00Z"),
    ]

    expect(
      getWeeklyTrend(entries, new Date("2026-01-10T12:00:00Z"), "UTC", { weeks: 2 })
    ).toEqual([
      { start: new Date("2025-12-29T00:00:00Z"), label: "Dec 29", count: 1, ratio: 1 },
      { start: new Date("2026-01-05T00:00:00Z"), label: "This week", count: 1, ratio: 1 },
    ])
  })

  it("starts weeks on the configured day", () => {
    // Sunday-start: Saturday Jan 10 belongs to the week beginning Jan 4.
    const entries = [makeEntry("c1", "2026-01-10T00:00:00Z")]

    const trend = getWeeklyTrend(entries, new Date("2026-01-10T12:00:00Z"), "UTC", {
      weekStartsOn: 0,
      weeks: 2,
    })

    expect(trend.map((week) => week.start)).toEqual([
      new Date("2025-12-28T00:00:00Z"),
      new Date("2026-01-04T00:00:00Z"),
    ])
    expect(trend[1].count).toBe(1)
  })
})

describe("getHistoryLog", () => {
  it("groups the most recent entries into local days and reports truncation", () => {
    const entries = [
      makeEntry("c1", "2026-01-10T09:05:00Z"),
      makeEntry("c2", "2026-01-09T22:30:00Z"),
      makeEntry("c3", "2026-01-07T08:00:00Z"),
      makeEntry("c4", "2026-01-01T00:00:00Z"),
    ]

    const log = getHistoryLog(entries, new Date("2026-01-10T12:00:00Z"), "UTC", { limit: 3 })

    expect(log.truncated).toBe(true)
    expect(log.total).toBe(4)
    expect(log.groups.map((group) => group.label)).toEqual([
      "Today",
      "Yesterday",
      "Wed, Jan 7",
    ])
    expect(log.groups[0].key).toBe("2026-01-10")
    expect(log.groups[0].entries[0].timeLabel).toBe("09:05")
    expect(log.groups[2].entries.map((entry) => entry.id)).toEqual(["c3"])
  })

  it("honours the 12-hour clock and day-month date format", () => {
    const entries = [makeEntry("c1", "2026-01-10T09:05:00Z")]

    const log = getHistoryLog(entries, new Date("2026-01-10T12:00:00Z"), "UTC", {
      hourCycle: "h12",
      dateFormat: "dmy",
    })

    expect(log.groups[0].entries[0].timeLabel).toBe("9:05 AM")
    expect(log.groups.map((group) => group.label)).toEqual(["Today"])
  })

  it("renders day-month day headers for older entries in dmy", () => {
    const entries = [makeEntry("c1", "2026-01-10T08:00:00Z")]

    const log = getHistoryLog(entries, new Date("2026-01-12T12:00:00Z"), "UTC", {
      dateFormat: "dmy",
    })

    expect(log.groups.map((group) => group.label)).toEqual(["Sat, 10 Jan"])
  })

  it("appends the year to dates outside the current local year", () => {
    const entries = [makeEntry("c1", "2025-12-20T00:00:00Z")]

    const log = getHistoryLog(entries, new Date("2026-01-10T12:00:00Z"), "UTC")

    expect(log.truncated).toBe(false)
    expect(log.groups.map((group) => group.label)).toEqual(["Sat, Dec 20, 2025"])
  })
})

describe("getCadence — recurrence passthrough", () => {
  it("carries a weekly chore's cadence so it can be described in words", () => {
    const entries = [
      makeEntry("w2", "2026-01-17T00:00:00Z", {
        choreId: "w",
        recurrence: "weekly",
        intervalDays: 1,
        recurrenceInterval: 2,
        recurrenceWeekday: 6,
      }),
      makeEntry("w1", "2026-01-03T00:00:00Z", {
        choreId: "w",
        recurrence: "weekly",
        intervalDays: 1,
        recurrenceInterval: 2,
        recurrenceWeekday: 6,
      }),
    ]

    const [row] = getCadence(entries, "UTC")

    expect(describeRecurrence(row)).toBe("Every 2 weeks on Saturday")
    expect(row.targetDays).toBe(14)
    expect(row.actualDays).toBe(14)
    expect(getCadenceVerdict(row)).toEqual({ state: "on-schedule", label: "On schedule" })
  })

  it("measures a monthly chore against the mean Gregorian month", () => {
    const entries = [
      makeEntry("m2", "2026-02-01T00:00:00Z", {
        choreId: "m",
        recurrence: "monthly",
        intervalDays: 1,
        recurrenceMonthDay: 1,
      }),
      makeEntry("m1", "2026-01-01T00:00:00Z", {
        choreId: "m",
        recurrence: "monthly",
        intervalDays: 1,
        recurrenceMonthDay: 1,
      }),
    ]

    const [row] = getCadence(entries, "UTC")

    // A 31-day gap on a mean 30.44-day month is still "on schedule".
    expect(row.actualDays).toBe(31)
    expect(getCadenceVerdict(row).state).toBe("on-schedule")
  })
})

describe("getCadenceVerdict", () => {
  it("calls anything inside the tolerance on schedule", () => {
    expect(getCadenceVerdict({ actualDays: 7, targetDays: 7 })).toEqual({
      state: "on-schedule",
      label: "On schedule",
    })
    expect(getCadenceVerdict({ actualDays: 7.4, targetDays: 7 }).state).toBe("on-schedule")
    expect(getCadenceVerdict({ actualDays: 6.6, targetDays: 7 }).state).toBe("on-schedule")
    // Tolerance scales with the target: 5% of two weeks is most of a day.
    expect(getCadenceVerdict({ actualDays: 14.6, targetDays: 14 }).state).toBe("on-schedule")
    expect(getCadenceVerdict({ actualDays: 14.8, targetDays: 14 }).state).toBe("late")
  })

  it("reads a longer mean as late and a shorter one as early", () => {
    expect(getCadenceVerdict({ actualDays: 9.5, targetDays: 7 })).toEqual({
      state: "late",
      label: "3 days late",
    })
    expect(getCadenceVerdict({ actualDays: 8, targetDays: 7 })).toEqual({
      state: "late",
      label: "1 day late",
    })
    expect(getCadenceVerdict({ actualDays: 13, targetDays: 14 })).toEqual({
      state: "early",
      label: "1 day early",
    })
    expect(getCadenceVerdict({ actualDays: 4, targetDays: 10 })).toEqual({
      state: "early",
      label: "6 days early",
    })
  })
})

describe("describeCadenceInterval", () => {
  it("drops the decimal for whole days and pluralizes", () => {
    expect(describeCadenceInterval(1)).toBe("usually 1 day apart")
    expect(describeCadenceInterval(13)).toBe("usually 13 days apart")
    expect(describeCadenceInterval(12.5)).toBe("usually 12.5 days apart")
    expect(describeCadenceInterval(1.4)).toBe("usually 1.4 days apart")
  })
})
