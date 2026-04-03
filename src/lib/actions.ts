"use server"

import { and, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

import { auth } from "@/lib/auth"
import { db } from "@/db"
import { chores, completions, householdMembers, rooms } from "@/db/schema"

async function getUserHouseholdId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Unauthorized")
  const membership = await db.query.householdMembers.findFirst({
    where: eq(householdMembers.userId, session.user.id),
  })
  if (!membership) throw new Error("Unauthorized")
  return membership.householdId
}


export async function markDone(
  choreId: string
): Promise<{ completionId: string }> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Unauthorized")

  const completionId = crypto.randomUUID()
  await db.insert(completions).values({
    id: completionId,
    choreId,
    userId: session.user.id,
    completedAt: new Date(),
    createdAt: new Date(),
  })

  revalidatePath("/dashboard")
  return { completionId }
}

export async function undoCompletion(completionId: string): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Unauthorized")

  await db.delete(completions).where(eq(completions.id, completionId))
  revalidatePath("/dashboard")
}
