import { describe, it, expect } from "vitest"
import { getDueDate, getDaysUntilDue, getOverdueDays } from "@/lib/chores"

describe("getDueDate", () => {
  it("returns the civil day of creation + interval when never completed", () => {
    const chore = {
      createdAt: new Date("2026-01-01T02:00:00Z"),
      intervalDays: 7,
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
