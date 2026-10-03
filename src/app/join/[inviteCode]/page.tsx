import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { db } from "@/db"
import { households, householdMembers } from "@/db/schema"
import { JoinSwitch } from "./join-switch"

export default async function JoinPage({
  params,
}: {
  params: Promise<{ inviteCode: string }>
}) {
  const { inviteCode } = await params

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    redirect(`/auth/sign-in?redirectTo=/join/${inviteCode}`)
  }

  const household = await db.query.households.findFirst({
    where: eq(households.inviteCode, inviteCode),
  })

  if (!household) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-bold">Invalid invite link</h1>
        <p className="text-muted-foreground">
          This invite link is not valid. Ask your household owner for a new one.
        </p>
      </main>
    )
  }

  const existingMembership = await db.query.householdMembers.findFirst({
    where: eq(householdMembers.userId, session.user.id),
    with: { household: true },
  })

  if (existingMembership) {
    if (existingMembership.householdId === household.id) {
      redirect("/dashboard")
    }
    const currentMembers = await db
      .select({ userId: householdMembers.userId })
      .from(householdMembers)
      .where(eq(householdMembers.householdId, existingMembership.householdId))

    return (
      <JoinSwitch
        inviteCode={household.inviteCode}
        currentName={existingMembership.household.name}
        targetName={household.name}
        isSoleMember={currentMembers.length <= 1}
      />
    )
  }

  await db.insert(householdMembers).values({
    householdId: household.id,
    userId: session.user.id,
    role: "member",
  })

  redirect("/dashboard")
}
