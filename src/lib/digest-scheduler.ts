import { isMailConfigured } from "./mail-config"
import { runDueDigests } from "./digest-runner"

const TICK_MS = 15 * 60 * 1000

declare global {
  var digestSchedulerStarted: boolean | undefined
}

/**
 * Starts the in-process digest tick. Idempotent: the guard lives on
 * `globalThis` so dev HMR reloads cannot stack intervals. Assumes one app
 * replica — two replicas can both send within the same tick.
 */
export function startDigestScheduler(): void {
  if (globalThis.digestSchedulerStarted) return
  globalThis.digestSchedulerStarted = true

  if (process.env.DIGEST_SCHEDULER === "off") return

  if (!isMailConfigured()) {
    console.warn(
      "[digest] SMTP not configured (set SMTP_HOST and MAIL_FROM); weekly digest disabled"
    )
    return
  }

  let running = false

  const tick = async () => {
    if (running) return
    running = true
    try {
      const result = await runDueDigests()
      if (result.sent > 0) {
        console.log(
          `[digest] checked ${result.households} households, sent ${result.sent} emails to ${result.recipients} recipients`
        )
      }
    } catch (error) {
      console.error("[digest] run failed", error)
    } finally {
      running = false
    }
  }

  setTimeout(tick, 20_000)
  setInterval(tick, TICK_MS)
}
