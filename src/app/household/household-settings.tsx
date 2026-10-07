"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, Pencil, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { TimeZoneCombobox } from "@/components/timezone-combobox"
import {
  deleteHousehold,
  leaveHousehold,
  regenerateInviteCode,
  removeMember,
  sendTestDigest,
  transferOwnership,
  updateDigestOptIn,
  updateHouseholdName,
  updateHouseholdPreferences,
  updateHouseholdTimezone,
} from "@/lib/actions"
import { isValidTimeZone, type TimeZoneOption } from "@/lib/timezone"
import { WEEKDAY_NAMES } from "@/lib/chores"
import {
  DATE_FORMAT_OPTIONS,
  HOUR_CYCLE_OPTIONS,
  type DateFormat,
  type HourCycle,
  type HouseholdPreferences,
} from "@/lib/preferences"

const selectClassName =
  "h-8 rounded-lg border border-border bg-transparent px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"

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
  preferences: HouseholdPreferences
  inviteCode: string
  members: MemberRow[]
  currentUserId: string
  isOwner: boolean
  mailConfigured: boolean
  notifyDigest: boolean
}

export function HouseholdSettings({
  name,
  timeZone,
  timeZoneOptions,
  preferences,
  inviteCode,
  members,
  currentUserId,
  isOwner,
  mailConfigured,
  notifyDigest: initialNotifyDigest,
}: HouseholdSettingsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editingName, setEditingName] = useState(false)
  const [householdName, setHouseholdName] = useState(name)
  const [selectedZone, setSelectedZone] = useState(timeZone)
  const [weekStartsOn, setWeekStartsOn] = useState(preferences.weekStartsOn)
  const [hourCycle, setHourCycle] = useState<HourCycle>(preferences.hourCycle)
  const [dateFormat, setDateFormat] = useState<DateFormat>(preferences.dateFormat)
  const [defaultIntervalDays, setDefaultIntervalDays] = useState(
    String(preferences.defaultIntervalDays)
  )
  const [digestEnabled, setDigestEnabled] = useState(preferences.digestEnabled)
  const [digestDay, setDigestDay] = useState(preferences.digestDay)
  const [digestHour, setDigestHour] = useState(preferences.digestHour)
  const [notifyDigest, setNotifyDigest] = useState(initialNotifyDigest)
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
  const preferencesChanged =
    weekStartsOn !== preferences.weekStartsOn ||
    hourCycle !== preferences.hourCycle ||
    dateFormat !== preferences.dateFormat ||
    parseInt(defaultIntervalDays, 10) !== preferences.defaultIntervalDays

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

  const handleSavePreferences = () => {
    startTransition(async () => {
      try {
        await updateHouseholdPreferences({
          weekStartsOn,
          hourCycle,
          dateFormat,
          defaultIntervalDays: parseInt(defaultIntervalDays, 10),
          digestEnabled,
          digestDay,
          digestHour,
        })
        toast.success("Preferences updated")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update preferences")
      }
    })
  }

  const handleDigestChange = (next: {
    digestEnabled: boolean
    digestDay: number
    digestHour: number
  }) => {
    const previous = { digestEnabled, digestDay, digestHour }
    setDigestEnabled(next.digestEnabled)
    setDigestDay(next.digestDay)
    setDigestHour(next.digestHour)
    startTransition(async () => {
      try {
        // Display preferences go along unchanged so a digest edit cannot
        // clobber unsaved edits sitting in the Preferences section.
        await updateHouseholdPreferences({
          weekStartsOn: preferences.weekStartsOn,
          hourCycle: preferences.hourCycle,
          dateFormat: preferences.dateFormat,
          defaultIntervalDays: preferences.defaultIntervalDays,
          ...next,
        })
        toast.success("Digest settings updated")
      } catch (error) {
        setDigestEnabled(previous.digestEnabled)
        setDigestDay(previous.digestDay)
        setDigestHour(previous.digestHour)
        toast.error(
          error instanceof Error ? error.message : "Could not update digest settings"
        )
      }
    })
  }

  const handleSendTest = () => {
    startTransition(async () => {
      try {
        await sendTestDigest()
        toast.success("Test email sent")
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not send the test email"
        )
      }
    })
  }

  const handleToggleOptIn = (enabled: boolean) => {
    setNotifyDigest(enabled)
    startTransition(async () => {
      try {
        await updateDigestOptIn(enabled)
        toast.success(enabled ? "Digest emails on" : "Digest emails off")
      } catch {
        setNotifyDigest(!enabled)
        toast.error("Could not update email setting")
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
        <h2 className="text-sm font-semibold">Preferences</h2>

        <label className="text-sm" htmlFor="household-week-start">Week starts on</label>
        <select
          id="household-week-start"
          className={selectClassName}
          value={String(weekStartsOn)}
          onChange={(e) => setWeekStartsOn(parseInt(e.target.value, 10))}
          disabled={isPending}
        >
          {WEEKDAY_NAMES.map((name, index) => (
            <option key={name} value={String(index)}>{name}</option>
          ))}
        </select>

        <label className="text-sm" htmlFor="household-hour-cycle">Time format</label>
        <select
          id="household-hour-cycle"
          className={selectClassName}
          value={hourCycle}
          onChange={(e) => setHourCycle(e.target.value as HourCycle)}
          disabled={isPending}
        >
          {HOUR_CYCLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <label className="text-sm" htmlFor="household-date-format">Date format</label>
        <select
          id="household-date-format"
          className={selectClassName}
          value={dateFormat}
          onChange={(e) => setDateFormat(e.target.value as DateFormat)}
          disabled={isPending}
        >
          {DATE_FORMAT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        <label className="text-sm" htmlFor="household-default-interval">
          Default chore interval (days)
        </label>
        <Input
          id="household-default-interval"
          className="w-24"
          type="number"
          min="1"
          max="1000"
          value={defaultIntervalDays}
          onChange={(e) => setDefaultIntervalDays(e.target.value)}
          disabled={isPending}
        />

        <p className="text-xs text-muted-foreground">
          Prefills the interval when adding a chore.
        </p>

        <Button
          className="self-start"
          onClick={handleSavePreferences}
          disabled={isPending || !preferencesChanged}
        >
          {isPending ? "Saving…" : "Save"}
        </Button>
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Email notifications</h2>

        <label className="flex items-center gap-2 text-sm" htmlFor="household-digest-enabled">
          <Checkbox
            id="household-digest-enabled"
            checked={digestEnabled}
            onCheckedChange={(checked) =>
              handleDigestChange({ digestEnabled: checked, digestDay, digestHour })
            }
            disabled={isPending || !mailConfigured}
          />
          Send a weekly chore digest to members
        </label>

        <label className="text-sm" htmlFor="household-digest-day">Send on</label>
        <select
          id="household-digest-day"
          className={selectClassName}
          value={String(digestDay)}
          onChange={(e) =>
            handleDigestChange({
              digestEnabled,
              digestDay: parseInt(e.target.value, 10),
              digestHour,
            })
          }
          disabled={isPending || !digestEnabled || !mailConfigured}
        >
          {WEEKDAY_NAMES.map((weekday, index) => (
            <option key={weekday} value={String(index)}>{weekday}</option>
          ))}
        </select>

        <label className="text-sm" htmlFor="household-digest-hour">Send at</label>
        <select
          id="household-digest-hour"
          className={selectClassName}
          value={String(digestHour)}
          onChange={(e) =>
            handleDigestChange({
              digestEnabled,
              digestDay,
              digestHour: parseInt(e.target.value, 10),
            })
          }
          disabled={isPending || !digestEnabled || !mailConfigured}
        >
          {Array.from({ length: 24 }, (_, hour) => (
            <option key={hour} value={String(hour)}>{String(hour).padStart(2, "0")}:00</option>
          ))}
        </select>

        <p className="text-xs text-muted-foreground">
          {mailConfigured
            ? "Times are in the household timezone. The digest is skipped when nothing is due."
            : "Set SMTP_HOST and MAIL_FROM on the server to enable email."}
        </p>

        <label className="flex items-center gap-2 text-sm" htmlFor="household-digest-opt-in">
          <Checkbox
            id="household-digest-opt-in"
            checked={notifyDigest}
            onCheckedChange={(checked) => handleToggleOptIn(checked)}
            disabled={isPending || !digestEnabled}
          />
          Email me the weekly digest
        </label>
        {mailConfigured && !digestEnabled && (
          <p className="text-xs text-muted-foreground">
            Weekly digest is off for this household.
          </p>
        )}

        <Button
          variant="outline"
          className="self-start"
          onClick={handleSendTest}
          disabled={isPending || !mailConfigured}
        >
          Send test email
        </Button>
        <p className="text-xs text-muted-foreground">
          Mails the digest to your own address now, without touching the weekly schedule.
        </p>
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
