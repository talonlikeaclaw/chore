import { and, asc, desc, eq } from "drizzle-orm"

import { db } from "@/db"
import { chores, completions, householdMembers, households, rooms, user } from "@/db/schema"
import { describeRecurrence, getDaysUntilDue, getDueDate } from "@/lib/chores"
import {
  DIGEST_WINDOW_DAYS,
  buildDigest,
  isDigestDue,
  type DigestChore,
} from "@/lib/digest"
import { isMailConfigured } from "@/lib/mail-config"
import { sendMail } from "@/lib/mailer"
import { isValidTimeZone } from "@/lib/timezone"

export type DigestRunResult = {
  households: number
  sent: number
  recipients: number
  failed: number
}

/**
 * Sends the weekly digest to every household that has crossed its local slot.
 * Idempotent across restarts and repeated ticks: the slot is recorded on the
 * household row, not in this process.
 */
export async function runDueDigests(now: Date = new Date()): Promise<DigestRunResult> {
  const result: DigestRunResult = { households: 0, sent: 0, recipients: 0, failed: 0 }
  if (!isMailConfigured()) return result

  const appUrl = (process.env.BETTER_AUTH_URL?.trim() || "http://localhost:3000").replace(
    /\/+$/,
    ""
  )

  const candidates = await db
    .select({
      id: households.id,
      name: households.name,
      timezone: households.timezone,
      dateFormat: households.dateFormat,
      digestDay: households.digestDay,
      digestHour: households.digestHour,
      digestLastSentOn: households.digestLastSentOn,
    })
    .from(households)
    .where(eq(households.digestEnabled, true))

  result.households = candidates.length

  for (const household of candidates) {
    try {
      if (!isValidTimeZone(household.timezone)) {
        console.error("[digest] invalid timezone", household.id, household.timezone)
        continue
      }

      const { due, scheduledOn } = isDigestDue({
        now,
        timeZone: household.timezone,
        day: household.digestDay,
        hour: household.digestHour,
        lastSentOn: household.digestLastSentOn,
      })
      if (!due) continue

      const recipients = await db
        .select({ email: user.email })
        .from(householdMembers)
        .innerJoin(user, eq(householdMembers.userId, user.id))
        .where(
          and(
            eq(householdMembers.householdId, household.id),
            eq(householdMembers.notifyDigest, true)
          )
        )

      const roomList = await db.query.rooms.findMany({
        where: eq(rooms.householdId, household.id),
        orderBy: [asc(rooms.sortOrder)],
        with: {
          chores: {
            where: eq(chores.active, true),
            with: {
              completions: {
                orderBy: [desc(completions.completedAt)],
                limit: 1,
                with: { user: { columns: { name: true } } },
              },
            },
          },
        },
      })

      const digestChores: DigestChore[] = []
      for (const room of roomList) {
        const roomChores: DigestChore[] = []
        for (const chore of room.chores) {
          const lastCompletion = chore.completions[0] ?? null
          const dueDate = getDueDate(chore, lastCompletion, household.timezone)
          const daysUntilDue = getDaysUntilDue(dueDate, now, household.timezone)
          if (daysUntilDue > DIGEST_WINDOW_DAYS) continue
          roomChores.push({
            name: chore.name,
            roomName: room.name,
            dueDate,
            daysUntilDue,
            cadence: describeRecurrence(chore),
            lastDoneBy: lastCompletion?.user.name ?? null,
          })
        }
        roomChores.sort(
          (a, b) => a.daysUntilDue - b.daysUntilDue || a.name.localeCompare(b.name)
        )
        digestChores.push(...roomChores)
      }

      // Nothing to report (or nobody to tell) still consumes the slot, so the
      // household does not get a stale digest on the next tick.
      if (digestChores.length === 0 || recipients.length === 0) {
        await markSlotConsumed(household.id, scheduledOn)
        continue
      }

      const email = buildDigest({
        householdName: household.name,
        appUrl,
        now,
        timeZone: household.timezone,
        dateFormat: household.dateFormat,
        chores: digestChores,
      })

      let sentForHousehold = 0
      for (const recipient of recipients) {
        try {
          await sendMail({ to: recipient.email, ...email })
          sentForHousehold += 1
          result.sent += 1
          result.recipients += 1
        } catch (error) {
          result.failed += 1
          console.error("[digest] send failed", household.id, recipient.email, error)
        }
      }

      // Every send failed → leave the slot open so the next tick retries.
      if (sentForHousehold > 0 || recipients.length === 0) {
        await markSlotConsumed(household.id, scheduledOn)
      }
    } catch (error) {
      console.error("[digest] household failed", household.id, error)
    }
  }

  return result
}

async function markSlotConsumed(householdId: string, scheduledOn: string): Promise<void> {
  await db
    .update(households)
    .set({ digestLastSentOn: scheduledOn })
    .where(eq(households.id, householdId))
}
