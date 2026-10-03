import { describe, expect, it } from "vitest"
import { normalizeHouseholdPreferences } from "@/lib/preferences"

const valid = {
  weekStartsOn: 1,
  hourCycle: "h23",
  dateFormat: "mdy",
  defaultIntervalDays: 7,
}

describe("normalizeHouseholdPreferences", () => {
  it("accepts and returns valid input", () => {
    expect(normalizeHouseholdPreferences(valid)).toEqual(valid)
  })

  it("accepts the range bounds", () => {
    expect(
      normalizeHouseholdPreferences({
        weekStartsOn: 0,
        hourCycle: "h12",
        dateFormat: "dmy",
        defaultIntervalDays: 1000,
      })
    ).toEqual({
      weekStartsOn: 0,
      hourCycle: "h12",
      dateFormat: "dmy",
      defaultIntervalDays: 1000,
    })
  })

  it("rejects a week start outside 0–6", () => {
    expect(() => normalizeHouseholdPreferences({ ...valid, weekStartsOn: 7 })).toThrow(
      "Choose a week start day"
    )
  })

  it("rejects an unknown hour cycle", () => {
    expect(() => normalizeHouseholdPreferences({ ...valid, hourCycle: "h24" })).toThrow(
      "Choose a time format"
    )
  })

  it("rejects an unknown date format", () => {
    expect(() => normalizeHouseholdPreferences({ ...valid, dateFormat: "iso" })).toThrow(
      "Choose a date format"
    )
  })

  it("rejects a non-positive default interval", () => {
    expect(() =>
      normalizeHouseholdPreferences({ ...valid, defaultIntervalDays: 0 })
    ).toThrow("Enter a default interval between 1 and 1000 days")
  })
})
