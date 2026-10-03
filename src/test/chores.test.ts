import { describe, it, expect } from "vitest"
import {
  describeRecurrence,
  formatDueDate,
  getDueBucket,
  getDueDate,
  getDaysUntilDue,
  getOverdueDays,
  normalizeRecurrence,
} from "@/lib/chores"

describe("getDueDate", () => {
  it("returns the civil day of creation + interval when never completed", () => {
    const chore = {
      createdAt: new Date("2026-01-01T02:00:00Z"),
      intervalDays: 7,
      recurrence: "days" as const,
      recurrenceInterval: 1,
      recurrenceWeekday: 0,
      recurrenceMonthDay: 1,
    }
    // 2026-01-01T02:00Z is 2025-12-31 in New York.
    expect(getDueDate(chore, null, "America/New_York")).toEqual(
      new Date("2026-01-07T00:00:00Z")
    )
  })

  it("uses the completion's civil day, not its instant", () => {
    const chore = {
      createdAt: new Date("2026-01-01T00:00:00Z"),
      intervalDays: 0,
      recurrence: "days" as const,
      recurrenceInterval: 1,
      recurrenceWeekday: 0,
      recurrenceMonthDay: 1,
    }
    const lastCompletion = { completedAt: new Date("2026-01-01T02:00:00Z") }
    expect(getDueDate(chore, lastCompletion, "America/New_York")).toEqual(
      new Date("2025-12-31T00:00:00Z")
    )
  })

  it("counts calendar days across a DST transition, not 48h", () => {
    const chore = {
      createdAt: new Date("2026-03-07T17:00:00Z"),
      intervalDays: 2,
      recurrence: "days" as const,
      recurrenceInterval: 1,
      recurrenceWeekday: 0,
      recurrenceMonthDay: 1,
    }
    // DST starts 2026-03-08 in New York; the span is 47h but 2 calendar days.
    expect(getDueDate(chore, null, "America/New_York")).toEqual(
      new Date("2026-03-09T00:00:00Z")
    )
  })

  it("prefers the last completion over creation", () => {
    const chore = {
      createdAt: new Date("2025-01-01T00:00:00Z"),
      intervalDays: 3,
      recurrence: "days" as const,
      recurrenceInterval: 1,
      recurrenceWeekday: 0,
      recurrenceMonthDay: 1,
    }
    const lastCompletion = { completedAt: new Date("2026-04-01T00:00:00Z") }
    expect(getDueDate(chore, lastCompletion, "UTC")).toEqual(
      new Date("2026-04-04T00:00:00Z")
    )
  })
})

describe("getDaysUntilDue", () => {
  it("is positive before the due day", () => {
    expect(
      getDaysUntilDue(
        new Date("2026-03-15T00:00:00Z"),
        new Date("2026-03-12T23:00:00Z"),
        "UTC"
      )
    ).toBe(3)
  })

  it("is 0 on the due day regardless of the time of day", () => {
    expect(
      getDaysUntilDue(
        new Date("2026-03-12T00:00:00Z"),
        new Date("2026-03-12T23:59:00Z"),
        "UTC"
      )
    ).toBe(0)
  })

  it("is negative when overdue", () => {
    expect(
      getDaysUntilDue(
        new Date("2026-03-10T00:00:00Z"),
        new Date("2026-03-12T00:00:00Z"),
        "UTC"
      )
    ).toBe(-2)
  })
})

describe("getOverdueDays", () => {
  it("is 0 when the due day is today or later", () => {
    expect(
      getOverdueDays(
        new Date("2026-03-12T00:00:00Z"),
        new Date("2026-03-12T13:00:00Z"),
        "UTC"
      )
    ).toBe(0)
    expect(
      getOverdueDays(
        new Date("2026-03-15T00:00:00Z"),
        new Date("2026-03-12T13:00:00Z"),
        "UTC"
      )
    ).toBe(0)
  })

  it("counts civil days past the due date", () => {
    expect(
      getOverdueDays(
        new Date("2026-03-10T00:00:00Z"),
        new Date("2026-03-12T23:00:00Z"),
        "UTC"
      )
    ).toBe(2)
  })

  it("depends on the household timezone", () => {
    // 2026-03-12T23:00Z is already 2026-03-13 in UTC+14.
    expect(
      getOverdueDays(
        new Date("2026-03-10T00:00:00Z"),
        new Date("2026-03-12T23:00:00Z"),
        "Pacific/Kiritimati"
      )
    ).toBe(3)
  })

  it("flips at the zone's local midnight, not UTC's", () => {
    const dueDate = new Date("2026-03-10T00:00:00Z")
    expect(
      getOverdueDays(dueDate, new Date("2026-03-11T03:59:00Z"), "America/New_York")
    ).toBe(0)
    expect(
      getOverdueDays(dueDate, new Date("2026-03-11T04:00:00Z"), "America/New_York")
    ).toBe(1)
  })
})

describe("getDueDate — weekly", () => {
  function weeklyChore(
    createdAt: string,
    recurrenceInterval: number,
    recurrenceWeekday: number
  ) {
    return {
      createdAt: new Date(createdAt),
      intervalDays: 1,
      recurrence: "weekly" as const,
      recurrenceInterval,
      recurrenceWeekday,
      recurrenceMonthDay: 1,
    }
  }

  it("lands on the next target weekday after creation", () => {
    // 2026-01-07 is a Wednesday.
    expect(
      getDueDate(weeklyChore("2026-01-07T12:00:00Z", 1, 6), null, "UTC")
    ).toEqual(new Date("2026-01-10T00:00:00Z"))
  })

  it("skips a whole interval when the base day is already the weekday", () => {
    expect(
      getDueDate(
        weeklyChore("2026-01-01T00:00:00Z", 1, 6),
        { completedAt: new Date("2026-01-10T00:00:00Z") },
        "UTC"
      )
    ).toEqual(new Date("2026-01-17T00:00:00Z"))
  })

  it("adds whole weeks for intervals above 1", () => {
    expect(
      getDueDate(
        weeklyChore("2026-01-01T00:00:00Z", 2, 6),
        { completedAt: new Date("2026-01-10T00:00:00Z") },
        "UTC"
      )
    ).toEqual(new Date("2026-01-24T00:00:00Z"))
  })

  it("uses the household-local day of the base instant", () => {
    // 2026-01-08T02:00Z is still Wednesday Jan 7 in New York.
    expect(
      getDueDate(weeklyChore("2026-01-08T02:00:00Z", 1, 6), null, "America/New_York")
    ).toEqual(new Date("2026-01-10T00:00:00Z"))
  })
})

describe("getDueDate — monthly", () => {
  function monthlyChore(recurrenceInterval: number, recurrenceMonthDay: number) {
    return {
      createdAt: new Date("2026-01-01T00:00:00Z"),
      intervalDays: 1,
      recurrence: "monthly" as const,
      recurrenceInterval,
      recurrenceWeekday: 0,
      recurrenceMonthDay,
    }
  }

  it("rolls to the next month when the day has passed", () => {
    expect(
      getDueDate(
        monthlyChore(1, 1),
        { completedAt: new Date("2026-01-15T00:00:00Z") },
        "UTC"
      )
    ).toEqual(new Date("2026-02-01T00:00:00Z"))
  })

  it("keeps the base month when the day is still ahead", () => {
    expect(
      getDueDate(
        monthlyChore(1, 25),
        { completedAt: new Date("2026-01-20T00:00:00Z") },
        "UTC"
      )
    ).toEqual(new Date("2026-01-25T00:00:00Z"))
  })

  it("clamps a missing day to the target month's last day", () => {
    expect(
      getDueDate(
        monthlyChore(1, 31),
        { completedAt: new Date("2026-01-31T00:00:00Z") },
        "UTC"
      )
    ).toEqual(new Date("2026-02-28T00:00:00Z"))
  })

  it("adds whole months for intervals above 1", () => {
    expect(
      getDueDate(
        monthlyChore(3, 1),
        { completedAt: new Date("2026-01-05T00:00:00Z") },
        "UTC"
      )
    ).toEqual(new Date("2026-04-01T00:00:00Z"))
  })
})

describe("normalizeRecurrence", () => {
  it("normalizes a weekly cadence and blanks the unused fields", () => {
    expect(
      normalizeRecurrence({ recurrence: "weekly", count: 2, weekday: 6, monthDay: 1 })
    ).toEqual({
      recurrence: "weekly",
      intervalDays: 1,
      recurrenceInterval: 2,
      recurrenceWeekday: 6,
      recurrenceMonthDay: 1,
    })
  })

  it("rejects a non-integer interval", () => {
    expect(() =>
      normalizeRecurrence({
        recurrence: "days",
        count: Number.NaN,
        weekday: 0,
        monthDay: 1,
      })
    ).toThrow("Enter a valid interval")
  })
})

describe("describeRecurrence", () => {
  const base = {
    createdAt: new Date("2026-01-01T00:00:00Z"),
    recurrenceWeekday: 0,
    recurrenceMonthDay: 1,
  }

  it("labels daily cadences", () => {
    expect(
      describeRecurrence({
        ...base,
        recurrence: "days",
        intervalDays: 1,
        recurrenceInterval: 1,
      })
    ).toBe("Every day")
    expect(
      describeRecurrence({
        ...base,
        recurrence: "days",
        intervalDays: 3,
        recurrenceInterval: 1,
      })
    ).toBe("Every 3 days")
  })

  it("labels weekly cadences", () => {
    expect(
      describeRecurrence({
        ...base,
        recurrence: "weekly",
        intervalDays: 1,
        recurrenceInterval: 1,
        recurrenceWeekday: 6,
      })
    ).toBe("Every Saturday")
    expect(
      describeRecurrence({
        ...base,
        recurrence: "weekly",
        intervalDays: 1,
        recurrenceInterval: 2,
        recurrenceWeekday: 6,
      })
    ).toBe("Every 2 weeks on Saturday")
  })

  it("labels monthly cadences with ordinals", () => {
    expect(
      describeRecurrence({
        ...base,
        recurrence: "monthly",
        intervalDays: 1,
        recurrenceInterval: 1,
        recurrenceMonthDay: 1,
      })
    ).toBe("Every month on the 1st")
    expect(
      describeRecurrence({
        ...base,
        recurrence: "monthly",
        intervalDays: 1,
        recurrenceInterval: 3,
        recurrenceMonthDay: 22,
      })
    ).toBe("Every 3 months on the 22nd")
  })
})

describe("getDueBucket", () => {
  const now = new Date("2026-10-02T12:00:00Z")

  it("buckets against today's civil day, within a week", () => {
    expect(getDueBucket(new Date("2026-10-01T00:00:00Z"), now, "UTC")).toBe("overdue")
    expect(getDueBucket(new Date("2026-10-02T00:00:00Z"), now, "UTC")).toBe("today")
    expect(getDueBucket(new Date("2026-10-03T00:00:00Z"), now, "UTC")).toBe("week")
    expect(getDueBucket(new Date("2026-10-09T00:00:00Z"), now, "UTC")).toBe("week")
    expect(getDueBucket(new Date("2026-10-10T00:00:00Z"), now, "UTC")).toBe("later")
  })
})

describe("formatDueDate", () => {
  it("omits the year within the household's current local year", () => {
    expect(
      formatDueDate(new Date("2026-10-02T00:00:00Z"), new Date("2026-10-02T12:00:00Z"), "UTC")
    ).toBe("Fri, Oct 2")
  })

  it("appends the year when it differs", () => {
    expect(
      formatDueDate(
        new Date("2027-01-01T00:00:00Z"),
        new Date("2026-12-30T12:00:00Z"),
        "UTC"
      )
    ).toBe("Fri, Jan 1, 2027")
  })

  it("compares against the local year, not the instant's UTC year", () => {
    // 2027-01-01T02:00Z is still 2026 in New York, so the year stays.
    expect(
      formatDueDate(
        new Date("2027-01-01T00:00:00Z"),
        new Date("2027-01-01T02:00:00Z"),
        "America/New_York"
      )
    ).toBe("Fri, Jan 1, 2027")
  })
})
