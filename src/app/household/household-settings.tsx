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
  regenerateInviteCode,
  removeMember,
  transferOwnership,
  updateHouseholdName,
  updateHouseholdTimezone,
} from "@/lib/actions"
import { isValidTimeZone, type TimeZoneOption } from "@/lib/timezone"

type MemberRow = {
  userId: string
  name: string
  email: string
  role: "owner" | "member"
}

type HouseholdSettingsProps = {
  name: string
  timeZone: string
  timeZoneOptions: TimeZoneOption[]
  inviteCode: string
  members: MemberRow[]
  currentUserId: string
  isOwner: boolean
}

export function HouseholdSettings({
  name,
  timeZone,
  timeZoneOptions,
  inviteCode,
  members,
  currentUserId,
  isOwner,
}: HouseholdSettingsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editingName, setEditingName] = useState(false)
  const [householdName, setHouseholdName] = useState(name)
  const [selectedZone, setSelectedZone] = useState(timeZone)
  const [confirmAction, setConfirmAction] = useState<"leave" | "delete" | null>(
    null
  )
  const [deleteConfirmName, setDeleteConfirmName] = useState("")
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [confirmTransferId, setConfirmTransferId] = useState<string | null>(
    null
  )
  const [confirmRegenerate, setConfirmRegenerate] = useState(false)
  const [invite, setInvite] = useState(inviteCode)

  const isSoleMember = members.length <= 1
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
        await deleteHousehold(deleteConfirmName)
        toast.success("Household deleted")
        router.push("/onboarding")
        router.refresh()
      } catch {
        toast.error("Could not delete household")
      }
    })
  }

  const handleRemoveMember = (userId: string) => {
    startTransition(async () => {
      try {
        await removeMember(userId)
        setConfirmRemoveId(null)
        toast.success("Member removed")
        router.refresh()
      } catch {
        toast.error("Could not remove member")
      }
    })
  }

  const handleTransferOwnership = (userId: string) => {
    startTransition(async () => {
      try {
        await transferOwnership(userId)
        setConfirmTransferId(null)
        toast.success("Ownership transferred")
        router.refresh()
      } catch {
        toast.error("Could not transfer ownership")
      }
    })
  }

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(`${window.location.origin}/join/${invite}`)
    toast.success("Invite link copied")
  }

  const handleRegenerate = () => {
    startTransition(async () => {
      try {
        const next = await regenerateInviteCode()
        setInvite(next)
        setConfirmRegenerate(false)
        toast.success("Invite link regenerated")
      } catch {
        toast.error("Could not regenerate invite code")
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
          {members.length} {members.length === 1 ? "member" : "members"}
        </p>
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Members</h2>
        <ul className="flex flex-col gap-2">
          {members.map((member) => (
            <li
              key={member.userId}
              className="flex flex-col gap-2 rounded-lg border border-border p-3"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {member.name}
                  {member.userId === currentUserId ? " (you)" : ""}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {member.role === "owner" ? "Owner" : "Member"}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {member.email}
              </span>
              {isOwner &&
                member.userId !== currentUserId &&
                member.role !== "owner" && (
                  <div className="flex flex-col gap-2">
                    {confirmTransferId === member.userId ? (
                      <div className="flex items-center gap-3">
                        <span className="text-sm">
                          Make {member.name} the owner? You&apos;ll become a
                          member.
                        </span>
                        <Button
                          size="sm"
                          onClick={() =>
                            handleTransferOwnership(member.userId)
                          }
                          disabled={isPending}
                        >
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmTransferId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="self-start"
                        onClick={() => setConfirmTransferId(member.userId)}
                      >
                        Make owner
                      </Button>
                    )}
                    {confirmRemoveId === member.userId ? (
                      <div className="flex items-center gap-3">
                        <span className="text-sm">
                          Remove {member.name} from {name}?
                        </span>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRemoveMember(member.userId)}
                          disabled={isPending}
                        >
                          Remove
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmRemoveId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="self-start"
                        onClick={() => setConfirmRemoveId(member.userId)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                )}
            </li>
          ))}
        </ul>
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Invite</h2>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">Invite code</span>
          <span className="rounded bg-muted px-2 py-1 font-mono text-sm">
            {invite}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="self-start" onClick={handleCopyInvite}>
            Copy invite link
          </Button>
          {isOwner &&
            (confirmRegenerate ? (
              <>
                <span className="text-sm">
                  Regenerate the invite code? The current link stops working.
                </span>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleRegenerate}
                  disabled={isPending}
                >
                  Regenerate
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmRegenerate(false)}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                className="self-start"
                onClick={() => setConfirmRegenerate(true)}
              >
                Regenerate
              </Button>
            ))}
        </div>
      </div>

      <Separator />

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
          <div className="flex flex-wrap items-center gap-2">
            {!isSoleMember && (
              <Button
                variant="destructive"
                onClick={() => setConfirmAction("leave")}
              >
                Leave household
              </Button>
            )}
            {isOwner && (
              <Button
                variant="destructive"
                onClick={() => setConfirmAction("delete")}
              >
                Delete household
              </Button>
            )}
          </div>
        ) : confirmAction === "delete" ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm">
              Permanently delete {name}? This cannot be undone.
            </span>
            <input
              className="rounded border border-border bg-transparent px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder={name}
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              disabled={isPending}
            />
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending || deleteConfirmName.trim() !== name}
            >
              Delete
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setConfirmAction(null)
                setDeleteConfirmName("")
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm">Leave {name}?</span>
            {isPending ? (
              <span className="text-sm text-muted-foreground">Working…</span>
            ) : (
              <>
                <Button size="sm" variant="destructive" onClick={handleLeave}>
                  Leave
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
