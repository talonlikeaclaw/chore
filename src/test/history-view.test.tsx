import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}))

vi.mock("@/lib/socket", () => ({
  getSocket: () => ({ emit: vi.fn(), on: vi.fn(), off: vi.fn() }),
}))

import { HistoryView } from "@/app/history/history-view"
import {
  getCadence,
  getHistoryLog,
  getHistoryTotals,
  getMemberTotals,
  getRoomTotals,
  getWeeklyTrend,
  type CompletionEntry,
} from "@/lib/history"

const now = new Date("2026-01-20T12:00:00Z")
const timeZone = "UTC"

const CADENCE_INTRO = /How often each chore actually/

function makeEntry(id: string, completedAt: string, overrides: Partial<CompletionEntry> = {}): CompletionEntry {
  return {
    id,
    completedAt: new Date(completedAt),
    choreId: "chore-a",
    choreName: "Vacuum",
    intervalDays: 7,
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

// Two chores with two completions each: Vacuum runs late, Laundry is on schedule.
const entries: CompletionEntry[] = [
  makeEntry("a-2", "2026-01-17T00:00:00Z"),
  makeEntry("a-1", "2026-01-01T00:00:00Z"),
  makeEntry("b-2", "2026-01-08T00:00:00Z", {
    choreId: "chore-b",
    choreName: "Laundry",
    roomId: "room-2",
    roomName: "Bedroom",
  }),
  makeEntry("b-1", "2026-01-01T00:00:00Z", {
    choreId: "chore-b",
    choreName: "Laundry",
    roomId: "room-2",
    roomName: "Bedroom",
  }),
  makeEntry("log-1", "2026-01-19T09:05:00Z", {
    choreId: "chore-c",
    choreName: "Mop floor",
  }),
]

function renderView() {
  return render(
    <HistoryView
      householdId="hh-1"
      householdName="Home"
      totals={getHistoryTotals(entries, now, timeZone)}
      memberTotals={getMemberTotals(entries, [{ userId: "user-1", name: "Ann" }])}
      roomTotals={getRoomTotals(entries)}
      cadence={getCadence(entries, timeZone)}
      weeks={getWeeklyTrend(entries, now, timeZone)}
      log={getHistoryLog(entries, now, timeZone)}
    />
  )
}

afterEach(cleanup)

describe("HistoryView", () => {
  it("shows the trend above a cadence list that starts open and can be collapsed", () => {
    renderView()

    const trend = screen.getByText("Last 8 weeks")
    const trigger = screen.getByRole("button", { name: /Cadence/ })
    expect(
      trend.compareDocumentPosition(trigger) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()

    expect(trigger.getAttribute("aria-expanded")).toBe("true")
    expect(within(trigger).getByText("2")).toBeTruthy()
    expect(screen.getByText(CADENCE_INTRO)).toBeTruthy()
    expect(screen.getByText("9 days late")).toBeTruthy()
    expect(screen.getByText("On schedule")).toBeTruthy()
    expect(screen.getByText("usually 16 days apart")).toBeTruthy()

    fireEvent.click(trigger)

    expect(trigger.getAttribute("aria-expanded")).toBe("false")
    expect(screen.queryByText(CADENCE_INTRO)).toBeNull()
    expect(screen.queryByText("9 days late")).toBeNull()
  })

  it("renders the log below the cadence list", () => {
    renderView()

    const trigger = screen.getByRole("button", { name: /Cadence/ })
    const logTitle = screen.getByText("Recent completions")
    const logHeading = screen.getByText("Yesterday")
    expect(
      trigger.compareDocumentPosition(logTitle) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(
      logTitle.compareDocumentPosition(logHeading) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(screen.getByText("Mop floor")).toBeTruthy()
    expect(screen.getByText("09:05")).toBeTruthy()
  })
})
