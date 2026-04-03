import { describe, it, expect } from "vitest"
import { getDueDate, getOverdueDays } from "@/lib/chores"

describe("getDueDate", () => {
  it("returns createdAt when chore has never been completed", () => {
    const chore = {
      createdAt: new Date("2026-01-01T00:00:00Z"),
      intervalDays: 7,
    }
    expect(getDueDate(chore, null)).toEqual(new Date("2026-01-01T00:00:00Z"))
  })

  it("returns lastCompletedAt + intervalDays when completed", () => {
    const chore = {
      createdAt: new Date("2026-01-01T00:00:00Z"),
      intervalDays: 7,
    }
    const lastCompletion = { completedAt: new Date("2026-03-01T00:00:00Z") }
    expect(getDueDate(chore, lastCompletion)).toEqual(
      new Date("2026-03-08T00:00:00Z")
    )
  })

  it("handles intervalDays of 1 correctly", () => {
    const chore = {
      createdAt: new Date("2026-01-01T00:00:00Z"),
      intervalDays: 1,
    }
    const lastCompletion = { completedAt: new Date("2026-04-01T00:00:00Z") }
    expect(getDueDate(chore, lastCompletion)).toEqual(
      new Date("2026-04-02T00:00:00Z")
    )
  })
})

describe("getOverdueDays", () => {
  it("returns 0 when due date is in the future", () => {
    const future = new Date()
    future.setDate(future.getDate() + 3)
    expect(getOverdueDays(future)).toBe(0)
  })

  it("returns 0 when due date is today", () => {
    const today = new Date()
    expect(getOverdueDays(today)).toBe(0)
  })

  it("returns positive number of days when past due date", () => {
    const past = new Date()
    past.setDate(past.getDate() - 5)
    past.setHours(0, 0, 0, 0)
    expect(getOverdueDays(past)).toBe(5)
  })
})
