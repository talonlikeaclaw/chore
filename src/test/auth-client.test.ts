import { authClient } from "@/lib/auth-client"

describe("authClient", () => {
  it("is defined", () => {
    expect(authClient).toBeDefined()
  })

  it("exposes signIn and signUp", () => {
    expect(authClient.signIn).toBeDefined()
    expect(authClient.signUp).toBeDefined()
  })
})
