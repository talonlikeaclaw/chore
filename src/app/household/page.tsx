import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { eq } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { db } from "@/db"
import { householdMembers } from "@/db/schema"
import { getTimeZoneOptions } from "@/lib/timezone"
import { HouseholdSettings } from "./household-settings"

export default async function HouseholdPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/auth/sign-in?redirectTo=/household")

  const membership = await db.query.householdMembers.findFirst({
    where: eq(householdMembers.userId, session.user.id),
    with: { household: true },
  })

  if (!membership) redirect("/onboarding")

  const members = await db
    .select({ userId: householdMembers.userId })
    .from(householdMembers)
    .where(eq(householdMembers.householdId, membership.householdId))

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      <Link
        href="/dashboard"
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to dashboard
      </Link>
      <HouseholdSettings
        name={membership.household.name}
        timeZone={membership.household.timezone}
        memberCount={members.length}
        timeZoneOptions={getTimeZoneOptions()}
      />
    </main>
  )
}
