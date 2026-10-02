"use client"

import { useState, useSyncExternalStore, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { TimeZoneCombobox } from "@/components/timezone-combobox"
import { createHousehold } from "@/lib/actions"
import { getBrowserTimeZone, isValidTimeZone, type TimeZoneOption } from "@/lib/timezone"

const subscribeToNothing = () => () => {}

let cachedBrowserZone: string | null = null

// Snapshot cached so the value is referentially stable across renders.
function getBrowserZoneSnapshot(): string {
  cachedBrowserZone ??= getBrowserTimeZone()
  return cachedBrowserZone
}

// Server snapshot is empty: the first client render must match SSR, and the
// browser's zone is only known after mount.
const getServerZoneSnapshot = () => ""

export function OnboardingView({
  timeZoneOptions,
}: {
  timeZoneOptions: TimeZoneOption[]
}) {
  const router = useRouter()
  const [householdName, setHouseholdName] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [chosenZone, setChosenZone] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const detectedZone = useSyncExternalStore(
    subscribeToNothing,
    getBrowserZoneSnapshot,
    getServerZoneSnapshot
  )
  // `null` means untouched, so the detected zone still applies; "" is an
  // explicit clear.
  const timeZone = chosenZone ?? detectedZone

  const handleCreate = () => {
    if (!householdName.trim() || !isValidTimeZone(timeZone)) return
    startTransition(async () => {
      await createHousehold(householdName.trim(), timeZone)
      router.push("/dashboard")
    })
  }

  const handleJoin = () => {
    const code = inviteCode.trim()
    if (!code) return
    // Extract just the code if they pasted a full URL
    const match = code.match(/\/join\/([^/?#]+)/)
    router.push(`/join/${match ? match[1] : code}`)
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Welcome</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a new household or join an existing one.
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Create a household</h2>
        <input
          className="w-full rounded border border-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="Household name"
          value={householdName}
          onChange={(e) => setHouseholdName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          disabled={isPending}
        />
        <TimeZoneCombobox
          id="onboarding-timezone"
          value={timeZone}
          onChange={setChosenZone}
          options={timeZoneOptions}
          placeholder="Search timezones"
          disabled={isPending}
        />
        <Button
          className="w-full"
          onClick={handleCreate}
          disabled={isPending || !householdName.trim() || !isValidTimeZone(timeZone)}
        >
          {isPending ? "Creating…" : "Create household"}
        </Button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Join with an invite link</h2>
        <input
          className="w-full rounded border border-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="Paste invite link or code"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
        />
        <Button
          variant="outline"
          className="w-full"
          onClick={handleJoin}
          disabled={!inviteCode.trim()}
        >
          Join household
        </Button>
      </div>
    </div>
  )
}
