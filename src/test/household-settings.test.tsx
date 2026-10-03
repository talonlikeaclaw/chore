import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock("@/lib/actions", () => ({
  deleteHousehold: vi.fn(),
  leaveHousehold: vi.fn(),
  updateHouseholdName: vi.fn(),
  updateHouseholdTimezone: vi.fn(),
  removeMember: vi.fn(),
  transferOwnership: vi.fn(),
  regenerateInviteCode: vi.fn(),
}))

import { HouseholdSettings } from "@/app/household/household-settings"

const members = [
  {
    userId: "owner-1",
    name: "Alex",
    email: "alex@example.com",
    role: "owner" as const,
  },
  {
    userId: "member-1",
    name: "Sam",
    email: "sam@example.com",
    role: "member" as const,
  },
]

afterEach(cleanup)

describe("HouseholdSettings", () => {
  it("lists members with names and role badges", () => {
    render(
      <HouseholdSettings
        name="Home"
        timeZone="UTC"
        timeZoneOptions={[]}
        inviteCode="invite-1"
        members={members}
        currentUserId="owner-1"
        isOwner
      />
    )

    expect(screen.getByText(/Alex/)).toBeTruthy()
    expect(screen.getByText(/Sam/)).toBeTruthy()
    expect(screen.getByText("Owner")).toBeTruthy()
    expect(screen.getByText("Member")).toBeTruthy()
  })

  it("lets the owner manage other members but not themselves", () => {
    render(
      <HouseholdSettings
        name="Home"
        timeZone="UTC"
        timeZoneOptions={[]}
        inviteCode="invite-1"
        members={members}
        currentUserId="owner-1"
        isOwner
      />
    )

    expect(screen.getAllByRole("button", { name: "Remove" })).toHaveLength(1)
    expect(screen.getAllByRole("button", { name: "Make owner" })).toHaveLength(1)
  })

  it("shows leave but not delete or member controls to a non-owner", () => {
    render(
      <HouseholdSettings
        name="Home"
        timeZone="UTC"
        timeZoneOptions={[]}
        inviteCode="invite-1"
        members={members}
        currentUserId="member-1"
        isOwner={false}
      />
    )

    expect(screen.getByRole("button", { name: "Leave household" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Delete household" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Remove" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Make owner" })).toBeNull()
  })

  it("requires the exact household name before deleting", () => {
    render(
      <HouseholdSettings
        name="Home"
        timeZone="UTC"
        timeZoneOptions={[]}
        inviteCode="invite-1"
        members={members}
        currentUserId="owner-1"
        isOwner
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Delete household" }))
    const confirm = screen.getByRole("button", {
      name: "Delete",
    }) as HTMLButtonElement
    const input = screen.getByPlaceholderText("Home") as HTMLInputElement

    expect(confirm.disabled).toBe(true)
    fireEvent.change(input, { target: { value: "Hom" } })
    expect(confirm.disabled).toBe(true)
    fireEvent.change(input, { target: { value: "Home" } })
    expect(confirm.disabled).toBe(false)
  })
})
