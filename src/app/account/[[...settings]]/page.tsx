import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { AccountView } from "@daveyplate/better-auth-ui"

import { auth } from "@/lib/auth"

export default async function AccountPage({
  params,
}: {
  params: Promise<{ settings?: string[] }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/auth/sign-in?redirectTo=/account/settings")

  const { settings } = await params
  const pathname = settings ? `/account/${settings.join("/")}` : "/account"

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      <Link
        href="/dashboard"
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to dashboard
      </Link>
      <AccountView pathname={pathname} />
    </main>
  )
}
