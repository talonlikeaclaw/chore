"use server"

import { eq } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

import { auth } from "@/lib/auth"
import { db } from "@/db"
import { completions } from "@/db/schema"

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
