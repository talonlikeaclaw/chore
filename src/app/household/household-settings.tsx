"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, Pencil, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { TimeZoneCombobox } from "@/components/timezone-combobox"
import {
  deleteHousehold,
  leaveHousehold,
  updateHouseholdName,
  updateHouseholdTimezone,
} from "@/lib/actions"
import { isValidTimeZone, type TimeZoneOption } from "@/lib/timezone"

type HouseholdSettingsProps = {
  name: string
  timeZone: string
  memberCount: number
  timeZoneOptions: TimeZoneOption[]
}

export function HouseholdSettings({
  name,
  timeZone,
  memberCount,
  timeZoneOptions,
}: HouseholdSettingsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editingName, setEditingName] = useState(false)
  const [householdName, setHouseholdName] = useState(name)
  const [selectedZone, setSelectedZone] = useState(timeZone)
  const [confirmAction, setConfirmAction] = useState<"leave" | "delete" | null>(
    null
  )

  const isSoleMember = memberCount <= 1
  const zoneChanged = selectedZone !== timeZone && isValidTimeZone(selectedZone)

  const handleSaveName = () => {
    startTransition(async () => {
      try {
        await updateHouseholdName(householdName)
        setEditingName(false)
        toast.success("Household renamed")
      } catch {
        toast.error("Could not rename household")
      }
    })
  }

  const cancelEditName = () => {
    setEditingName(false)
    setHouseholdName(name)
  }

  const handleSaveZone = () => {
    startTransition(async () => {
      try {
        await updateHouseholdTimezone(selectedZone)
        toast.success("Timezone updated")
      } catch {
        toast.error("Could not update timezone")
      }
    })
  }

  const handleLeave = () => {
    startTransition(async () => {
      try {
        await leaveHousehold()
        toast.success("Left household")
        router.push("/onboarding")
        router.refresh()
      } catch {
        toast.error("Could not leave household")
      }
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteHousehold()
        toast.success("Household deleted")
        router.push("/onboarding")
        router.refresh()
      } catch {
        toast.error("Could not delete household")
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        {editingName ? (
          <div className="flex min-h-[44px] items-center gap-2">
            <input
              className="min-w-0 flex-1 rounded border border-border bg-transparent px-2 py-1 text-xl font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveName()
                if (e.key === "Escape") cancelEditName()
              }}
              autoFocus
            />
            <Button size="icon-touch" variant="ghost" onClick={handleSaveName}>
              <Check className="h-4 w-4" />
            </Button>
            <Button size="icon-touch" variant="ghost" onClick={cancelEditName}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex min-h-[44px] items-center gap-2">
            <h1 className="flex-1 text-xl font-semibold">{name}</h1>
            <Button
              size="icon-touch"
              variant="ghost"
              aria-label="Rename household"
              onClick={() => setEditingName(true)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {memberCount} {memberCount === 1 ? "member" : "members"}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <label className="text-sm font-semibold" htmlFor="household-timezone">
          Timezone
        </label>
        <TimeZoneCombobox
          id="household-timezone"
          value={selectedZone}
          onChange={setSelectedZone}
          options={timeZoneOptions}
          placeholder="Search timezones"
          disabled={isPending}
        />
        <p className="text-xs text-muted-foreground">
          Chore due dates and overdue badges follow this timezone&apos;s calendar
          days.
        </p>
        <Button
          className="self-start"
          onClick={handleSaveZone}
          disabled={isPending || !zoneChanged}
        >
          {isPending ? "Saving…" : "Save"}
        </Button>
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Danger zone</h2>
        {isSoleMember ? (
          <p className="text-xs text-muted-foreground">
            You&apos;re the only member, so leaving is unavailable — deleting
            removes this household and all of its rooms and chores.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Leaving removes your access to {name}. You&apos;ll need an invite
            link to rejoin.
          </p>
        )}
        {confirmAction === null ? (
          <Button
            className="self-start"
            variant="destructive"
            onClick={() => setConfirmAction(isSoleMember ? "delete" : "leave")}
          >
            {isSoleMember ? "Delete household" : "Leave household"}
          </Button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm">
              {confirmAction === "delete"
                ? `Permanently delete ${name}?`
                : `Leave ${name}?`}
            </span>
            {isPending ? (
              <span className="text-sm text-muted-foreground">Working…</span>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={
                    confirmAction === "delete" ? handleDelete : handleLeave
                  }
                >
                  {confirmAction === "delete" ? "Delete" : "Leave"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmAction(null)}
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
