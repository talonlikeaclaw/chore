import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock("@/lib/actions", () => ({
  switchHousehold: vi.fn().mockResolvedValue(undefined),
}))

import { JoinSwitch } from "@/app/join/[inviteCode]/join-switch"
import { switchHousehold } from "@/lib/actions"

afterEach(cleanup)

describe("JoinSwitch", () => {
  it("warns that switching deletes a solo household", () => {
    render(
      <JoinSwitch
        inviteCode="code-1"
        currentName="Home"
        targetName="Cabin"
        isSoleMember
      />
    )

    expect(
      screen.getByRole("button", { name: "Delete Home and join Cabin" })
    ).toBeTruthy()
  })

  it("says leaving for a multi-member household", () => {
    render(
      <JoinSwitch
        inviteCode="code-1"
        currentName="Home"
        targetName="Cabin"
        isSoleMember={false}
      />
    )

    expect(
      screen.getByRole("button", { name: "Leave Home and join Cabin" })
    ).toBeTruthy()
  })

  it("switches with the invite code when clicked", async () => {
    render(
      <JoinSwitch
        inviteCode="code-1"
        currentName="Home"
        targetName="Cabin"
        isSoleMember
      />
    )

    fireEvent.click(
      screen.getByRole("button", { name: "Delete Home and join Cabin" })
    )

    await waitFor(() => expect(switchHousehold).toHaveBeenCalledWith("code-1"))
  })
})
