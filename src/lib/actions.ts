"use server"

import { and, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

import { auth } from "@/lib/auth"
import { db } from "@/db"
import { chores, completions, households, householdMembers, rooms } from "@/db/schema"

async function getUserHouseholdId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Unauthorized")
  const membership = await db.query.householdMembers.findFirst({
    where: eq(householdMembers.userId, session.user.id),
  })
  if (!membership) throw new Error("Unauthorized")
  return membership.householdId
}

// --- Household setup ---

export async function createHousehold(name: string): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Unauthorized")
  const existing = await db.query.householdMembers.findFirst({
    where: eq(householdMembers.userId, session.user.id),
  })
  if (existing) throw new Error("Already in a household")
  const householdId = crypto.randomUUID()
  await db.insert(households).values({
    id: householdId,
    name,
    inviteCode: crypto.randomUUID(),
  })
  await db.insert(householdMembers).values({
    householdId,
    userId: session.user.id,
    role: "owner",
  })
  revalidatePath("/dashboard")
}

// --- Completions ---

export async function markDone(
  choreId: string
): Promise<{ completionId: string }> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Unauthorized")

  const householdId = await getUserHouseholdId()
  const completionId = crypto.randomUUID()
  await db.insert(completions).values({
    id: completionId,
    choreId,
    userId: session.user.id,
    completedAt: new Date(),
    createdAt: new Date(),
  })

  globalThis.socketio?.to(`household:${householdId}`).emit("chore:done", { choreId, completionId })
  revalidatePath("/dashboard")
  return { completionId }
}

export async function undoCompletion(completionId: string): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Unauthorized")

  const completion = await db.query.completions.findFirst({
    where: eq(completions.id, completionId),
    with: { chore: { with: { room: true } } },
  })

  await db.delete(completions).where(eq(completions.id, completionId))

  if (completion) {
    const householdId = completion.chore.room.householdId
    globalThis.socketio?.to(`household:${householdId}`).emit("chore:undone", { completionId })
  }

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
  globalThis.socketio?.to(`household:${householdId}`).emit("household:updated")
  revalidatePath("/dashboard")
}

export async function updateRoom(roomId: string, name: string): Promise<void> {
  const householdId = await getUserHouseholdId()
  await db
    .update(rooms)
    .set({ name })
    .where(and(eq(rooms.id, roomId), eq(rooms.householdId, householdId)))
  globalThis.socketio?.to(`household:${householdId}`).emit("household:updated")
  revalidatePath("/dashboard")
}

type DeletedRoom = {
  id: string
  name: string
  householdId: string
  createdAt: Date
  chores: Array<{ id: string; name: string; intervalDays: number; createdAt: Date }>
}

export async function deleteRoom(roomId: string): Promise<DeletedRoom> {
  const householdId = await getUserHouseholdId()
  const room = await db.query.rooms.findFirst({
    where: and(eq(rooms.id, roomId), eq(rooms.householdId, householdId)),
    with: { chores: true },
  })
  if (!room) throw new Error("Not found")
  await db
    .delete(rooms)
    .where(and(eq(rooms.id, roomId), eq(rooms.householdId, householdId)))
  globalThis.socketio?.to(`household:${householdId}`).emit("household:updated")
  revalidatePath("/dashboard")
  return {
    id: room.id,
    name: room.name,
    householdId: room.householdId,
    createdAt: room.createdAt,
    chores: room.chores.map((c) => ({
      id: c.id,
      name: c.name,
      intervalDays: c.intervalDays,
      createdAt: c.createdAt,
    })),
  }
}

export async function undoDeleteRoom(data: DeletedRoom): Promise<void> {
  const householdId = await getUserHouseholdId()
  if (data.householdId !== householdId) throw new Error("Unauthorized")
  await db.insert(rooms).values({
    id: data.id,
    name: data.name,
    householdId: data.householdId,
    createdAt: new Date(data.createdAt),
  })
  if (data.chores.length > 0) {
    await db.insert(chores).values(
      data.chores.map((c) => ({
        id: c.id,
        name: c.name,
        roomId: data.id,
        intervalDays: c.intervalDays,
        createdAt: new Date(c.createdAt),
      }))
    )
  }
  globalThis.socketio?.to(`household:${householdId}`).emit("household:updated")
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
  globalThis.socketio?.to(`household:${householdId}`).emit("household:updated")
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
  globalThis.socketio?.to(`household:${householdId}`).emit("household:updated")
  revalidatePath("/dashboard")
}

type DeletedChore = {
  id: string
  name: string
  roomId: string
  intervalDays: number
  createdAt: Date
}

export async function deleteChore(choreId: string): Promise<DeletedChore> {
  const householdId = await getUserHouseholdId()
  const chore = await db.query.chores.findFirst({
    where: eq(chores.id, choreId),
    with: { room: true },
  })
  if (!chore || chore.room.householdId !== householdId)
    throw new Error("Unauthorized")
  await db.delete(chores).where(eq(chores.id, choreId))
  globalThis.socketio?.to(`household:${householdId}`).emit("household:updated")
  revalidatePath("/dashboard")
  return {
    id: chore.id,
    name: chore.name,
    roomId: chore.roomId,
    intervalDays: chore.intervalDays,
    createdAt: chore.createdAt,
  }
}

export async function undoDeleteChore(data: DeletedChore): Promise<void> {
  const householdId = await getUserHouseholdId()
  const room = await db.query.rooms.findFirst({
    where: and(eq(rooms.id, data.roomId), eq(rooms.householdId, householdId)),
  })
  if (!room) throw new Error("Unauthorized")
  await db.insert(chores).values({
    id: data.id,
    name: data.name,
    roomId: data.roomId,
    intervalDays: data.intervalDays,
    createdAt: new Date(data.createdAt),
  })
  globalThis.socketio?.to(`household:${householdId}`).emit("household:updated")
  revalidatePath("/dashboard")
}
