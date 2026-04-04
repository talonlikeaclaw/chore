import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { db } from "@/db"
import { householdMembers } from "@/db/schema"
import { OnboardingView } from "./onboarding-view"

export default async function OnboardingPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/auth/sign-in")

  const membership = await db.query.householdMembers.findFirst({
    where: eq(householdMembers.userId, session.user.id),
  })
  if (membership) redirect("/dashboard")

  return (
    <main className="container flex grow flex-col items-center justify-center self-center p-4 md:p-6">
      <OnboardingView />
    </main>
  )
}
