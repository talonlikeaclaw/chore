import { render, screen } from "@testing-library/react"
import { vi } from "vitest"

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}))

vi.mock("@daveyplate/better-auth-ui", () => ({
  AuthUIProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-provider">{children}</div>
  ),
}))

vi.mock("@/lib/auth-client", () => ({
  authClient: {},
}))

import { Providers } from "@/app/providers"

describe("Providers", () => {
  it("renders children", () => {
    render(
      <Providers>
        <span>hello</span>
      </Providers>
    )
    expect(screen.getByText("hello")).toBeInTheDocument()
  })
})
