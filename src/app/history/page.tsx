import { headers } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { asc, desc, eq } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { db } from "@/db"
import { chores, completions, householdMembers, rooms, user } from "@/db/schema"
import {
  getCadence,
  getHistoryLog,
  getHistoryTotals,
  getMemberTotals,
  getRoomTotals,
  getWeeklyTrend,
} from "@/lib/history"
import { HistoryView } from "./history-view"

export default async function HistoryPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/auth/sign-in?redirectTo=/history")

  const membership = await db.query.householdMembers.findFirst({
    where: eq(householdMembers.userId, session.user.id),
    with: { household: true },
  })

  if (!membership) redirect("/onboarding")

  const householdId = membership.householdId
  const timeZone = membership.household.timezone
  const now = new Date()

  const memberRows = await db
    .select({ userId: householdMembers.userId, name: user.name })
    .from(householdMembers)
    .innerJoin(user, eq(householdMembers.userId, user.id))
    .where(eq(householdMembers.householdId, householdId))
    .orderBy(asc(user.name))

  const entries = await db
    .select({
      id: completions.id,
      completedAt: completions.completedAt,
      choreId: completions.choreId,
      choreName: chores.name,
      intervalDays: chores.intervalDays,
      roomId: rooms.id,
      roomName: rooms.name,
      userId: completions.userId,
      userName: user.name,
    })
    .from(completions)
    .innerJoin(chores, eq(completions.choreId, chores.id))
    .innerJoin(rooms, eq(chores.roomId, rooms.id))
    .innerJoin(user, eq(completions.userId, user.id))
    .where(eq(rooms.householdId, householdId))
    .orderBy(desc(completions.completedAt))

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      <Link
        href="/dashboard"
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to dashboard
      </Link>
      <HistoryView
        householdId={householdId}
        householdName={membership.household.name}
        totals={getHistoryTotals(entries, now, timeZone)}
        memberTotals={getMemberTotals(entries, memberRows)}
        roomTotals={getRoomTotals(entries)}
        cadence={getCadence(entries, timeZone)}
        weeks={getWeeklyTrend(entries, now, timeZone)}
        log={getHistoryLog(entries, now, timeZone)}
      />
    </main>
  )
}
