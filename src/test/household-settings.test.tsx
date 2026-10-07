import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
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
  updateHouseholdPreferences: vi.fn(),
  updateDigestOptIn: vi.fn(),
  sendTestDigest: vi.fn(),
  removeMember: vi.fn(),
  transferOwnership: vi.fn(),
  regenerateInviteCode: vi.fn(),
}))

import { HouseholdSettings } from "@/app/household/household-settings"
import { sendTestDigest, updateDigestOptIn, updateHouseholdPreferences } from "@/lib/actions"
import { toast } from "sonner"

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

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("HouseholdSettings", () => {
  it("lists members with names and role badges", () => {
    render(
      <HouseholdSettings
        name="Home"
        timeZone="UTC"
        timeZoneOptions={[]}
        preferences={{
          weekStartsOn: 1,
          hourCycle: "h23",
          dateFormat: "mdy",
          defaultIntervalDays: 7,
          digestEnabled: true,
          digestDay: 1,
          digestHour: 8,
        }}
        inviteCode="invite-1"
        members={members}
        currentUserId="owner-1"
        isOwner
        mailConfigured
        notifyDigest
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
        preferences={{
          weekStartsOn: 1,
          hourCycle: "h23",
          dateFormat: "mdy",
          defaultIntervalDays: 7,
          digestEnabled: true,
          digestDay: 1,
          digestHour: 8,
        }}
        inviteCode="invite-1"
        members={members}
        currentUserId="owner-1"
        isOwner
        mailConfigured
        notifyDigest
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
        preferences={{
          weekStartsOn: 1,
          hourCycle: "h23",
          dateFormat: "mdy",
          defaultIntervalDays: 7,
          digestEnabled: true,
          digestDay: 1,
          digestHour: 8,
        }}
        inviteCode="invite-1"
        members={members}
        currentUserId="member-1"
        isOwner={false}
        mailConfigured
        notifyDigest
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
        preferences={{
          weekStartsOn: 1,
          hourCycle: "h23",
          dateFormat: "mdy",
          defaultIntervalDays: 7,
          digestEnabled: true,
          digestDay: 1,
          digestHour: 8,
        }}
        inviteCode="invite-1"
        members={members}
        currentUserId="owner-1"
        isOwner
        mailConfigured
        notifyDigest
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

  it("enables the Preferences save once a preference changes", () => {
    render(
      <HouseholdSettings
        name="Home"
        timeZone="UTC"
        timeZoneOptions={[]}
        preferences={{
          weekStartsOn: 1,
          hourCycle: "h23",
          dateFormat: "mdy",
          defaultIntervalDays: 7,
          digestEnabled: true,
          digestDay: 1,
          digestHour: 8,
        }}
        inviteCode="invite-1"
        members={members}
        currentUserId="owner-1"
        isOwner
        mailConfigured
        notifyDigest
      />
    )

    const saves = screen.getAllByRole("button", { name: "Save" }) as HTMLButtonElement[]
    expect(saves.every((button) => button.disabled)).toBe(true)

    fireEvent.change(screen.getByLabelText("Week starts on"), { target: { value: "0" } })

    expect(saves.some((button) => !button.disabled)).toBe(true)
  })

  it("keeps the digest day and hour disabled until the digest is on", () => {
    render(
      <HouseholdSettings
        name="Home"
        timeZone="UTC"
        timeZoneOptions={[]}
        preferences={{
          weekStartsOn: 1,
          hourCycle: "h23",
          dateFormat: "mdy",
          defaultIntervalDays: 7,
          digestEnabled: false,
          digestDay: 1,
          digestHour: 8,
        }}
        inviteCode="invite-1"
        members={members}
        currentUserId="owner-1"
        isOwner
        mailConfigured
        notifyDigest
      />
    )

    expect(
      screen.getByRole("checkbox", { name: "Send a weekly chore digest to members" })
    ).toBeTruthy()
    expect((screen.getByLabelText("Send on") as HTMLSelectElement).disabled).toBe(true)
    expect((screen.getByLabelText("Send at") as HTMLSelectElement).disabled).toBe(true)
    expect(
      screen
        .getByRole("checkbox", { name: "Email me the weekly digest" })
        .getAttribute("aria-disabled")
    ).toBe("true")
    expect(screen.getByText("Weekly digest is off for this household.")).toBeTruthy()
  })

  it("enables the digest day and hour once the digest is on", () => {
    render(
      <HouseholdSettings
        name="Home"
        timeZone="UTC"
        timeZoneOptions={[]}
        preferences={{
          weekStartsOn: 1,
          hourCycle: "h23",
          dateFormat: "mdy",
          defaultIntervalDays: 7,
          digestEnabled: true,
          digestDay: 3,
          digestHour: 20,
        }}
        inviteCode="invite-1"
        members={members}
        currentUserId="owner-1"
        isOwner
        mailConfigured
        notifyDigest
      />
    )

    const day = screen.getByLabelText("Send on") as HTMLSelectElement
    const hour = screen.getByLabelText("Send at") as HTMLSelectElement
    expect(day.disabled).toBe(false)
    expect(hour.disabled).toBe(false)
    expect(day.value).toBe("3")
    expect(hour.value).toBe("20")
    expect(hour.options).toHaveLength(24)
  })

  it("disables the digest controls and explains why when mail is unconfigured", () => {
    render(
      <HouseholdSettings
        name="Home"
        timeZone="UTC"
        timeZoneOptions={[]}
        preferences={{
          weekStartsOn: 1,
          hourCycle: "h23",
          dateFormat: "mdy",
          defaultIntervalDays: 7,
          digestEnabled: true,
          digestDay: 1,
          digestHour: 8,
        }}
        inviteCode="invite-1"
        members={members}
        currentUserId="owner-1"
        isOwner
        mailConfigured={false}
        notifyDigest
      />
    )

    expect(
      screen
        .getByRole("checkbox", { name: "Send a weekly chore digest to members" })
        .getAttribute("aria-disabled")
    ).toBe("true")
    expect((screen.getByLabelText("Send on") as HTMLSelectElement).disabled).toBe(true)
    expect(
      screen.getByText("Set SMTP_HOST and MAIL_FROM on the server to enable email.")
    ).toBeTruthy()
  })

  it("toggles the personal digest opt-in immediately", () => {
    render(
      <HouseholdSettings
        name="Home"
        timeZone="UTC"
        timeZoneOptions={[]}
        preferences={{
          weekStartsOn: 1,
          hourCycle: "h23",
          dateFormat: "mdy",
          defaultIntervalDays: 7,
          digestEnabled: true,
          digestDay: 1,
          digestHour: 8,
        }}
        inviteCode="invite-1"
        members={members}
        currentUserId="owner-1"
        isOwner
        mailConfigured
        notifyDigest
      />
    )

    fireEvent.click(screen.getByRole("checkbox", { name: "Email me the weekly digest" }))

    expect(updateDigestOptIn).toHaveBeenCalledWith(false)
  })

  it("saves the household digest switch immediately", async () => {
    render(
      <HouseholdSettings
        name="Home"
        timeZone="UTC"
        timeZoneOptions={[]}
        preferences={{
          weekStartsOn: 1,
          hourCycle: "h23",
          dateFormat: "mdy",
          defaultIntervalDays: 7,
          digestEnabled: true,
          digestDay: 1,
          digestHour: 8,
        }}
        inviteCode="invite-1"
        members={members}
        currentUserId="owner-1"
        isOwner
        mailConfigured
        notifyDigest
      />
    )

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Send a weekly chore digest to members" })
    )

    await waitFor(() =>
      expect(updateHouseholdPreferences).toHaveBeenCalledWith(
        expect.objectContaining({ digestEnabled: false, digestDay: 1, digestHour: 8 })
      )
    )
  })

  it("saves the digest day immediately without arming the Preferences save", async () => {
    render(
      <HouseholdSettings
        name="Home"
        timeZone="UTC"
        timeZoneOptions={[]}
        preferences={{
          weekStartsOn: 1,
          hourCycle: "h23",
          dateFormat: "mdy",
          defaultIntervalDays: 7,
          digestEnabled: true,
          digestDay: 1,
          digestHour: 8,
        }}
        inviteCode="invite-1"
        members={members}
        currentUserId="owner-1"
        isOwner
        mailConfigured
        notifyDigest
      />
    )

    fireEvent.change(screen.getByLabelText("Send on"), { target: { value: "3" } })

    await waitFor(() =>
      expect(updateHouseholdPreferences).toHaveBeenCalledWith(
        expect.objectContaining({ digestEnabled: true, digestDay: 3, digestHour: 8 })
      )
    )

    const saves = await waitFor(() => {
      const buttons = screen.getAllByRole("button", { name: "Save" }) as HTMLButtonElement[]
      expect(buttons).toHaveLength(2)
      return buttons
    })
    expect(saves.every((button) => button.disabled)).toBe(true)
  })

  it("sends a test email even while the weekly digest is off", async () => {
    render(
      <HouseholdSettings
        name="Home"
        timeZone="UTC"
        timeZoneOptions={[]}
        preferences={{
          weekStartsOn: 1,
          hourCycle: "h23",
          dateFormat: "mdy",
          defaultIntervalDays: 7,
          digestEnabled: false,
          digestDay: 1,
          digestHour: 8,
        }}
        inviteCode="invite-1"
        members={members}
        currentUserId="owner-1"
        isOwner
        mailConfigured
        notifyDigest
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Send test email" }))

    await waitFor(() => expect(sendTestDigest).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Test email sent"))
  })

  it("disables the test email when mail is unconfigured", () => {
    render(
      <HouseholdSettings
        name="Home"
        timeZone="UTC"
        timeZoneOptions={[]}
        preferences={{
          weekStartsOn: 1,
          hourCycle: "h23",
          dateFormat: "mdy",
          defaultIntervalDays: 7,
          digestEnabled: true,
          digestDay: 1,
          digestHour: 8,
        }}
        inviteCode="invite-1"
        members={members}
        currentUserId="owner-1"
        isOwner
        mailConfigured={false}
        notifyDigest
      />
    )

    expect(screen.getByRole("button", { name: "Send test email" })).toBeDisabled()
  })

  it("surfaces the SMTP error when the test email fails", async () => {
    vi.mocked(sendTestDigest).mockRejectedValueOnce(new Error("SMTP is not configured"))

    render(
      <HouseholdSettings
        name="Home"
        timeZone="UTC"
        timeZoneOptions={[]}
        preferences={{
          weekStartsOn: 1,
          hourCycle: "h23",
          dateFormat: "mdy",
          defaultIntervalDays: 7,
          digestEnabled: true,
          digestDay: 1,
          digestHour: 8,
        }}
        inviteCode="invite-1"
        members={members}
        currentUserId="owner-1"
        isOwner
        mailConfigured
        notifyDigest
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Send test email" }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("SMTP is not configured")
    )
  })
})
