import { describe, expect, it } from "vitest"
import {
  addCivilDays,
  civilDaysBetween,
  getBrowserTimeZone,
  getDatePartsInTimeZone,
  getDaysAgo,
  getTimeZoneOffsetLabel,
  getTimeZoneOptions,
  isValidTimeZone,
  matchTimeZoneOptions,
  toCivilDate,
} from "@/lib/timezone"

describe("getDatePartsInTimeZone", () => {
  it("resolves the local calendar date of an instant", () => {
    expect(
      getDatePartsInTimeZone(
        new Date("2026-01-01T02:00:00Z"),
        "America/New_York"
      )
    ).toEqual({ year: 2025, month: 12, day: 31 })
  })

  it("resolves the UTC date for the UTC zone", () => {
    expect(
      getDatePartsInTimeZone(new Date("2026-07-04T23:30:00Z"), "UTC")
    ).toEqual({ year: 2026, month: 7, day: 4 })
  })
})

describe("toCivilDate", () => {
  it("returns UTC midnight of the local day", () => {
    expect(
      toCivilDate(new Date("2026-01-01T02:00:00Z"), "America/New_York")
    ).toEqual(new Date("2025-12-31T00:00:00Z"))
  })
})

describe("addCivilDays", () => {
  it("adds whole days across a DST transition on the UTC axis", () => {
    expect(
      addCivilDays(new Date("2026-03-07T00:00:00Z"), 2)
    ).toEqual(new Date("2026-03-09T00:00:00Z"))
  })

  it("subtracts days", () => {
    expect(
      addCivilDays(new Date("2026-03-09T00:00:00Z"), -1)
    ).toEqual(new Date("2026-03-08T00:00:00Z"))
  })
})

describe("civilDaysBetween", () => {
  it("is signed", () => {
    const from = new Date("2026-03-10T00:00:00Z")
    const to = new Date("2026-03-14T00:00:00Z")
    expect(civilDaysBetween(from, to)).toBe(4)
    expect(civilDaysBetween(to, from)).toBe(-4)
  })
})

describe("isValidTimeZone", () => {
  it("accepts IANA zones", () => {
    expect(isValidTimeZone("America/New_York")).toBe(true)
    expect(isValidTimeZone("UTC")).toBe(true)
  })

  it("rejects empty, invalid and non-string input", () => {
    expect(isValidTimeZone("")).toBe(false)
    expect(isValidTimeZone("Not/AZone")).toBe(false)
    expect(isValidTimeZone("  ")).toBe(false)
  })
})

describe("getBrowserTimeZone", () => {
  it("returns a usable timezone string", () => {
    expect(isValidTimeZone(getBrowserTimeZone())).toBe(true)
  })
})

describe("getTimeZoneOffsetLabel", () => {
  const at = new Date("2026-01-15T00:00:00Z")

  it("labels zero and whole-hour offsets", () => {
    expect(getTimeZoneOffsetLabel("UTC", at)).toBe("UTC+00:00")
    expect(getTimeZoneOffsetLabel("America/New_York", at)).toBe("UTC-05:00")
    expect(getTimeZoneOffsetLabel("Pacific/Kiritimati", at)).toBe("UTC+14:00")
  })

  it("labels half-hour offsets", () => {
    expect(getTimeZoneOffsetLabel("Asia/Kathmandu", at)).toBe("UTC+05:45")
  })

  it("follows daylight saving", () => {
    expect(
      getTimeZoneOffsetLabel("America/New_York", new Date("2026-07-15T00:00:00Z"))
    ).toBe("UTC-04:00")
  })
})

describe("getTimeZoneOptions", () => {
  it("prepends UTC and pairs every zone with an offset label", () => {
    const options = getTimeZoneOptions(new Date("2026-01-15T00:00:00Z"))
    expect(options[0]).toEqual({ timeZone: "UTC", offsetLabel: "UTC+00:00" })
    expect(options.length).toBeGreaterThan(400)
    expect(options.every((option) => option.offsetLabel.startsWith("UTC"))).toBe(
      true
    )
    expect(
      options.find((option) => option.timeZone === "America/New_York")
    ).toEqual({ timeZone: "America/New_York", offsetLabel: "UTC-05:00" })
  })
})

describe("matchTimeZoneOptions", () => {
  const options = [
    { timeZone: "UTC", offsetLabel: "UTC+00:00" },
    { timeZone: "America/New_York", offsetLabel: "UTC-05:00" },
    { timeZone: "America/Argentina/Buenos_Aires", offsetLabel: "UTC-03:00" },
    { timeZone: "Asia/Tokyo", offsetLabel: "UTC+09:00" },
    { timeZone: "Pacific/Kiritimati", offsetLabel: "UTC+14:00" },
  ]
  const names = (query: string) =>
    matchTimeZoneOptions(options, query).map((option) => option.timeZone)

  it("returns everything for an empty query", () => {
    expect(names("")).toEqual(options.map((option) => option.timeZone))
  })

  it("ignores case and separators", () => {
    expect(names("new york")).toEqual(["America/New_York"])
    expect(names("NEW_YORK")).toEqual(["America/New_York"])
    expect(names("newyork")).toEqual(["America/New_York"])
  })

  it("ranks prefix matches above substring matches", () => {
    expect(names("kiritimati")).toEqual(["Pacific/Kiritimati"])
    expect(names("arg")).toEqual(["America/Argentina/Buenos_Aires"])
  })

  it("falls back to in-order subsequence matches", () => {
    expect(names("tkyo")).toEqual(["Asia/Tokyo"])
  })

  it("returns nothing when nothing matches", () => {
    expect(names("zzzz")).toEqual([])
  })
})

describe("getDaysAgo", () => {
  it("counts civil days, not 24h windows", () => {
    expect(
      getDaysAgo(
        new Date("2026-03-09T23:00:00Z"),
        new Date("2026-03-10T01:00:00Z"),
        "UTC"
      )
    ).toBe(1)
  })

  it("is timezone sensitive", () => {
    // 23:00 UTC on 2026-03-09 is already 2026-03-10 in UTC+14.
    expect(
      getDaysAgo(
        new Date("2026-03-09T23:00:00Z"),
        new Date("2026-03-10T01:00:00Z"),
        "Pacific/Kiritimati"
      )
    ).toBe(0)
  })
})
