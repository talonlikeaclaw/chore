import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { desc, eq } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { db } from "@/db"
import { chores, completions, householdMembers, rooms } from "@/db/schema"
import { DashboardView } from "./dashboard-view"

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/auth/sign-in")

  const membership = await db.query.householdMembers.findFirst({
    where: eq(householdMembers.userId, session.user.id),
    with: { household: true },
  })

  if (!membership) redirect("/onboarding")

  const roomList = await db.query.rooms.findMany({
    where: eq(rooms.householdId, membership.householdId),
    with: {
      chores: {
        where: eq(chores.active, true),
        with: {
          completions: {
            orderBy: [desc(completions.completedAt)],
            limit: 1,
            with: {
              user: {
                columns: { name: true },
              },
            },
          },
        },
      },
    },
  })

  return (
    <DashboardView
      rooms={roomList}
      inviteCode={membership.household.inviteCode}
      householdId={membership.householdId}
    />
  )
}
