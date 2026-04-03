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

// --- Completions ---

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

// --- Rooms ---

export async function createRoom(name: string): Promise<void> {
  const householdId = await getUserHouseholdId()
  await db.insert(rooms).values({
    id: crypto.randomUUID(),
    name,
    householdId,
  })
  revalidatePath("/dashboard")
}

export async function updateRoom(roomId: string, name: string): Promise<void> {
  const householdId = await getUserHouseholdId()
  await db
    .update(rooms)
    .set({ name })
    .where(and(eq(rooms.id, roomId), eq(rooms.householdId, householdId)))
  revalidatePath("/dashboard")
}

export async function deleteRoom(roomId: string): Promise<void> {
  const householdId = await getUserHouseholdId()
  await db
    .delete(rooms)
    .where(and(eq(rooms.id, roomId), eq(rooms.householdId, householdId)))
  revalidatePath("/dashboard")
}

// --- Chores ---

export async function createChore(
  roomId: string,
  name: string,
  intervalDays: number
): Promise<void> {
  const householdId = await getUserHouseholdId()
  const room = await db.query.rooms.findFirst({
    where: and(eq(rooms.id, roomId), eq(rooms.householdId, householdId)),
  })
  if (!room) throw new Error("Unauthorized")
  await db.insert(chores).values({
    id: crypto.randomUUID(),
    name,
    roomId,
    intervalDays,
  })
  revalidatePath("/dashboard")
}

export async function updateChore(
  choreId: string,
  name: string,
  intervalDays: number
): Promise<void> {
  const householdId = await getUserHouseholdId()
  const chore = await db.query.chores.findFirst({
    where: eq(chores.id, choreId),
    with: { room: true },
  })
  if (!chore || chore.room.householdId !== householdId)
    throw new Error("Unauthorized")
  await db
    .update(chores)
    .set({ name, intervalDays })
    .where(eq(chores.id, choreId))
  revalidatePath("/dashboard")
}

export async function deleteChore(choreId: string): Promise<void> {
  const householdId = await getUserHouseholdId()
  const chore = await db.query.chores.findFirst({
    where: eq(chores.id, choreId),
    with: { room: true },
  })
  if (!chore || chore.room.householdId !== householdId)
    throw new Error("Unauthorized")
  await db.delete(chores).where(eq(chores.id, choreId))
  revalidatePath("/dashboard")
}
