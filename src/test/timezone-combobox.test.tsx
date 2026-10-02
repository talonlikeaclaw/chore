import { useState } from "react"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { TimeZoneCombobox } from "@/components/timezone-combobox"
import type { TimeZoneOption } from "@/lib/timezone"

const options: TimeZoneOption[] = [
  { timeZone: "UTC", offsetLabel: "UTC+00:00" },
  { timeZone: "America/New_York", offsetLabel: "UTC-05:00" },
  { timeZone: "Asia/Tokyo", offsetLabel: "UTC+09:00" },
  { timeZone: "Pacific/Kiritimati", offsetLabel: "UTC+14:00" },
]

function Harness({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <TimeZoneCombobox value={value} onChange={setValue} options={options} />
      <output data-testid="value">{value}</output>
    </>
  )
}

const input = () => screen.getByRole("combobox") as HTMLInputElement
const optionNames = () =>
  screen.queryAllByRole("option").map((option) => option.textContent)

afterEach(cleanup)

describe("TimeZoneCombobox", () => {
  it("shows no suggestions until the user types", () => {
    render(<Harness initial="" />)
    expect(optionNames()).toEqual([])
  })

  it("filters as the user types and shows each zone's offset", () => {
    render(<Harness initial="" />)
    fireEvent.change(input(), { target: { value: "york" } })
    expect(optionNames()).toEqual(["America/New_YorkUTC-05:00"])
  })

  it("narrows to a single match for a distinctive query", () => {
    render(<Harness initial="" />)
    fireEvent.change(input(), { target: { value: "kiritimati" } })
    expect(optionNames()).toEqual(["Pacific/KiritimatiUTC+14:00"])
  })

  it("commits the zone when a suggestion is clicked", () => {
    render(<Harness initial="" />)
    fireEvent.change(input(), { target: { value: "york" } })
    fireEvent.click(screen.getByRole("option"))
    expect(screen.getByTestId("value").textContent).toBe("America/New_York")
    expect(input().value).toBe("America/New_York")
    expect(optionNames()).toEqual([])
  })

  it("commits the best match when Enter is pressed", () => {
    render(<Harness initial="" />)
    fireEvent.change(input(), { target: { value: "kiritimati" } })
    fireEvent.keyDown(input(), { key: "Enter" })
    expect(screen.getByTestId("value").textContent).toBe("Pacific/Kiritimati")
    expect(input().value).toBe("Pacific/Kiritimati")
  })

  it("commits the arrow-key highlighted match, not the best match", () => {
    render(<Harness initial="" />)
    // Ranked matches for "a": America/New_York, then Asia/Tokyo.
    fireEvent.change(input(), { target: { value: "a" } })
    // The first ArrowDown opens the list; each further press moves the highlight.
    fireEvent.keyDown(input(), { key: "ArrowDown" })
    fireEvent.keyDown(input(), { key: "ArrowDown" })
    fireEvent.keyDown(input(), { key: "ArrowDown" })
    const highlighted = screen
      .queryAllByRole("option")
      .find((option) => option.hasAttribute("data-highlighted"))
    expect(highlighted?.textContent).toBe("Asia/TokyoUTC+09:00")
    fireEvent.keyDown(input(), { key: "Enter" })
    expect(screen.getByTestId("value").textContent).toBe("Asia/Tokyo")
  })

  it("hides suggestions once the text is an exact zone", () => {
    render(<Harness initial="Asia/Tokyo" />)
    expect(input().value).toBe("Asia/Tokyo")
    expect(optionNames()).toEqual([])
  })

  it("keeps unmatched text as-is so callers can validate it", () => {
    render(<Harness initial="" />)
    fireEvent.change(input(), { target: { value: "not a zone" } })
    expect(optionNames()).toEqual([])
    expect(screen.getByTestId("value").textContent).toBe("not a zone")
  })
})
