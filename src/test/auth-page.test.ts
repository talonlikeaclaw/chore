import { authViewPaths } from "@daveyplate/better-auth-ui/server"
import { generateStaticParams } from "@/app/auth/[path]/page"

describe("auth page", () => {
  it("generates a static param for every auth view path", () => {
    const params = generateStaticParams()
    const expectedPaths = Object.values(authViewPaths)
    expect(params).toHaveLength(expectedPaths.length)
  })

  it("each param has a string path property", () => {
    const params = generateStaticParams()
    for (const param of params) {
      expect(typeof param.path).toBe("string")
    }
  })
})
