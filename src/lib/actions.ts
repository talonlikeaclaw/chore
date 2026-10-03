"use server"

import { and, asc, eq, sql } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

import { auth } from "@/lib/auth"
import { db } from "@/db"
import { chores, completions, households, householdMembers, rooms } from "@/db/schema"
import { isValidTimeZone } from "@/lib/timezone"

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

async function getUserMembership(): Promise<{
  householdId: string
  userId: string
  role: "owner" | "member"
}> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Unauthorized")
  const membership = await db.query.householdMembers.findFirst({
    where: eq(householdMembers.userId, session.user.id),
  })
  if (!membership) throw new Error("Unauthorized")
  return { householdId: membership.householdId, userId: session.user.id, role: membership.role }
}

async function requireOwner(): Promise<{ householdId: string; userId: string }> {
  const membership = await getUserMembership()
  if (membership.role !== "owner") throw new Error("Only the owner can do that")
  return membership
}

async function getUserHouseholdId(): Promise<string> {
  return (await getUserMembership()).householdId
}

async function detachMember(
  tx: DbTransaction,
  membership: { householdId: string; userId: string; role: "owner" | "member" },
  options: { deleteIfSole: boolean }
): Promise<void> {
  const members = await tx.query.householdMembers.findMany({
    where: eq(householdMembers.householdId, membership.householdId),
    orderBy: [asc(householdMembers.joinedAt)],
  })
  if (members.length <= 1) {
    if (!options.deleteIfSole) throw new Error("The last member cannot leave")
    await tx.delete(households).where(eq(households.id, membership.householdId))
    return
  }
  await tx
    .delete(householdMembers)
    .where(
      and(
        eq(householdMembers.householdId, membership.householdId),
        eq(householdMembers.userId, membership.userId)
      )
    )
  if (membership.role === "owner") {
    const successor = members.find((m) => m.userId !== membership.userId)!
    await tx
      .update(householdMembers)
      .set({ role: "owner" })
      .where(
        and(
          eq(householdMembers.householdId, membership.householdId),
          eq(householdMembers.userId, successor.userId)
        )
      )
  }
}

// --- Household setup ---

export async function createHousehold(
  name: string,
  timeZone: string
): Promise<void> {
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
    timezone: isValidTimeZone(timeZone) ? timeZone : "UTC",
  })
  await db.insert(householdMembers).values({
    householdId,
    userId: session.user.id,
    role: "owner",
  })
  revalidatePath("/dashboard")
}

export async function updateHouseholdTimezone(timeZone: string): Promise<void> {
  const householdId = await getUserHouseholdId()
  if (!isValidTimeZone(timeZone)) throw new Error("Invalid timezone")
  await db
    .update(households)
    .set({ timezone: timeZone })
    .where(eq(households.id, householdId))
  globalThis.socketio?.to(`household:${householdId}`).emit("household:updated")
  revalidatePath("/dashboard")
  revalidatePath("/household")
}

export async function updateHouseholdName(name: string): Promise<void> {
  const householdId = await getUserHouseholdId()
  const trimmed = name.trim()
  if (!trimmed) throw new Error("Enter a household name")
  await db
    .update(households)
    .set({ name: trimmed })
    .where(eq(households.id, householdId))
  globalThis.socketio?.to(`household:${householdId}`).emit("household:updated")
  revalidatePath("/dashboard")
  revalidatePath("/household")
}

export async function leaveHousehold(): Promise<void> {
  const membership = await getUserMembership()
  await db.transaction(async (tx) => {
    await detachMember(tx, membership, { deleteIfSole: false })
  })
  globalThis.socketio?.to(`household:${membership.householdId}`).emit("household:updated")
  revalidatePath("/dashboard")
  revalidatePath("/household")
  revalidatePath("/history")
}

export async function deleteHousehold(confirmName: string): Promise<void> {
  const { householdId } = await requireOwner()
  const household = await db.query.households.findFirst({
    where: eq(households.id, householdId),
  })
  if (!household) throw new Error("Household not found")
  if (confirmName.trim() !== household.name) throw new Error("Household name does not match")
  await db.delete(households).where(eq(households.id, householdId))
  globalThis.socketio?.to(`household:${householdId}`).emit("household:updated")
  revalidatePath("/dashboard")
  revalidatePath("/household")
  revalidatePath("/history")
}

export async function removeMember(userId: string): Promise<void> {
  const { householdId, userId: callerId } = await requireOwner()
  if (userId === callerId) throw new Error("Use leave to remove yourself")
  const target = await db.query.householdMembers.findFirst({
    where: and(eq(householdMembers.householdId, householdId), eq(householdMembers.userId, userId)),
  })
  if (!target) throw new Error("Member not found")
  if (target.role === "owner") throw new Error("Cannot remove the owner")
  await db
    .delete(householdMembers)
    .where(and(eq(householdMembers.householdId, householdId), eq(householdMembers.userId, userId)))
  globalThis.socketio?.to(`household:${householdId}`).emit("household:updated")
  revalidatePath("/household")
  revalidatePath("/history")
}

export async function transferOwnership(userId: string): Promise<void> {
  const { householdId, userId: callerId } = await requireOwner()
  if (userId === callerId) throw new Error("You are already the owner")
  const target = await db.query.householdMembers.findFirst({
    where: and(eq(householdMembers.householdId, householdId), eq(householdMembers.userId, userId)),
  })
  if (!target) throw new Error("Member not found")
  await db.transaction(async (tx) => {
    await tx
      .update(householdMembers)
      .set({ role: "member" })
      .where(and(eq(householdMembers.householdId, householdId), eq(householdMembers.userId, callerId)))
    await tx
      .update(householdMembers)
      .set({ role: "owner" })
      .where(and(eq(householdMembers.householdId, householdId), eq(householdMembers.userId, userId)))
  })
  globalThis.socketio?.to(`household:${householdId}`).emit("household:updated")
  revalidatePath("/household")
}

export async function regenerateInviteCode(): Promise<string> {
  const { householdId } = await requireOwner()
  const inviteCode = crypto.randomUUID()
  await db.update(households).set({ inviteCode }).where(eq(households.id, householdId))
  globalThis.socketio?.to(`household:${householdId}`).emit("household:updated")
  revalidatePath("/dashboard")
  revalidatePath("/household")
  return inviteCode
}

export async function switchHousehold(inviteCode: string): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Unauthorized")
  const target = await db.query.households.findFirst({
    where: eq(households.inviteCode, inviteCode),
  })
  if (!target) throw new Error("Invalid invite code")
  const current = await db.query.householdMembers.findFirst({
    where: eq(householdMembers.userId, session.user.id),
  })
  if (current?.householdId === target.id) return
  const oldHouseholdId = current?.householdId ?? null
  await db.transaction(async (tx) => {
    if (current) {
      await detachMember(
        tx,
        { householdId: current.householdId, userId: session.user.id, role: current.role },
        { deleteIfSole: true }
      )
    }
    await tx.insert(householdMembers).values({
      householdId: target.id,
      userId: session.user.id,
      role: "member",
    })
  })
  if (oldHouseholdId) {
    globalThis.socketio?.to(`household:${oldHouseholdId}`).emit("household:updated")
  }
  globalThis.socketio?.to(`household:${target.id}`).emit("household:updated")
  revalidatePath("/dashboard")
  revalidatePath("/household")
  revalidatePath("/history")
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
  const maxOrder = await db
    .select({ max: sql<number>`MAX(${rooms.sortOrder})` })
    .from(rooms)
    .where(eq(rooms.householdId, householdId))
  const sortOrder = (maxOrder[0]?.max ?? -1) + 1
  await db.insert(rooms).values({
    id: crypto.randomUUID(),
    name,
    householdId,
    sortOrder,
  })
  globalThis.socketio?.to(`household:${householdId}`).emit("household:updated")
  revalidatePath("/dashboard")
}

export async function reorderRooms(roomIds: string[]): Promise<void> {
  const householdId = await getUserHouseholdId()
  const existingRooms = await db.query.rooms.findMany({
    where: eq(rooms.householdId, householdId),
  })
  const roomMap = new Map(existingRooms.map((r) => [r.id, r]))
  for (let i = 0; i < roomIds.length; i++) {
    const room = roomMap.get(roomIds[i])
    if (!room) continue
    if (room.sortOrder !== i) {
      await db
        .update(rooms)
        .set({ sortOrder: i })
        .where(and(eq(rooms.id, roomIds[i]), eq(rooms.householdId, householdId)))
    }
  }
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
