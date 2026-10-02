import Link from "next/link"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { AuthUIProvider } from "@daveyplate/better-auth-ui"
import type { AuthUIProviderProps } from "@daveyplate/better-auth-ui"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}))

import { NavBar } from "@/app/dashboard/nav-bar"
import { authClient } from "@/lib/auth-client"

// Signed-in session, injected through the provider's documented `hooks` seam.
const signedInHooks = {
  useSession: () => ({
    data: {
      user: {
        id: "user-1",
        name: "Talon",
        email: "talon@example.com",
        emailVerified: true,
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-01T00:00:00Z"),
      },
      session: {
        id: "session-1",
        token: "token",
        userId: "user-1",
        expiresAt: new Date("2030-01-01T00:00:00Z"),
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-01T00:00:00Z"),
      },
    },
    isPending: false,
    error: null,
    refetch: () => {},
  }),
} as unknown as AuthUIProviderProps["hooks"]

afterEach(cleanup)

describe("NavBar", () => {
  it("distinguishes household from account settings in the user menu", async () => {
    const { container } = render(
      <AuthUIProvider
        authClient={authClient}
        navigate={() => {}}
        replace={() => {}}
        Link={Link}
        hooks={signedInHooks}
      >
        <NavBar />
      </AuthUIProvider>
    )

    const trigger = container.querySelector("button")
    expect(trigger).not.toBeNull()
    fireEvent.pointerDown(trigger!)

    const household = await screen.findByText("Household")
    const householdLink = household.closest("a")
    expect(householdLink?.getAttribute("href")).toBe("/household")
    expect(householdLink?.querySelector("svg")).not.toBeNull()

    // The library's own entry is relabelled so the menu never shows two
    // entries that both read "Settings".
    const account = screen.getByText("Account")
    expect(account.closest("a")?.getAttribute("href")).toContain("/account")
    expect(screen.queryByText("Settings")).toBeNull()
  })
})
