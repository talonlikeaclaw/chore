"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Check, Loader2, Pencil, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  describeRecurrence,
  formatDueDate,
  getDueDate,
  getDaysUntilDue,
  getOverdueDays,
  normalizeRecurrence,
  type ChoreRecurrence,
  type Recurrence,
} from "@/lib/chores"
import { getDaysAgo } from "@/lib/timezone"
import { updateChore, deleteChore, undoDeleteChore } from "@/lib/actions"
import { RecurrenceFields } from "@/components/recurrence-fields"
import type { Chore } from "./types"
import type { DateFormat } from "@/lib/preferences"

type ChoreRowProps = {
  chore: Chore
  roomName?: string
  isOptimisticallyDone: boolean
  onMarkDone: (choreId: string) => void
  timeZone: string
  now: Date
  dateFormat: DateFormat
}

export function ChoreRow({ chore, roomName, isOptimisticallyDone, onMarkDone, timeZone, now, dateFormat }: ChoreRowProps) {
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editName, setEditName] = useState(chore.name)
  const [editRecurrence, setEditRecurrence] = useState<Recurrence>(chore.recurrence)
  const [editCount, setEditCount] = useState(
    String(chore.recurrence === "days" ? chore.intervalDays : chore.recurrenceInterval)
  )
  const [editWeekday, setEditWeekday] = useState(String(chore.recurrenceWeekday))
  const [editMonthDay, setEditMonthDay] = useState(String(chore.recurrenceMonthDay))
  const [isPending, startTransition] = useTransition()

  const lastCompletion = chore.completions[0] ?? null
  const dueDate = getDueDate(chore, lastCompletion, timeZone)
  const daysUntilDue = getDaysUntilDue(dueDate, now, timeZone)
  const overdueDays = isOptimisticallyDone
    ? 0
    : getOverdueDays(dueDate, now, timeZone)

  const lastDoneText = (() => {
    if (isOptimisticallyDone) return "Just completed"
    if (!lastCompletion) return null
    const daysAgo = getDaysAgo(lastCompletion.completedAt, now, timeZone)
    const when = daysAgo === 0 ? "today" : `${daysAgo}d ago`
    return `Last done by ${lastCompletion.user.name} ${when}`
  })()

  const handleSave = () => {
    if (!editName.trim()) {
      toast.warning("Enter a chore name")
      return
    }
    let normalized: ChoreRecurrence
    try {
      normalized = normalizeRecurrence({
        recurrence: editRecurrence,
        count: parseInt(editCount, 10),
        weekday: parseInt(editWeekday, 10),
        monthDay: parseInt(editMonthDay, 10),
      })
    } catch (error) {
      toast.warning(error instanceof Error ? error.message : "Invalid recurrence")
      return
    }
    startTransition(async () => {
      await updateChore(chore.id, editName.trim(), normalized)
      setEditing(false)
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      const deleted = await deleteChore(chore.id)
      toast(`"${deleted.name}" deleted`, {
        duration: 5000,
        action: {
          label: "Undo",
          onClick: () => undoDeleteChore(deleted),
        },
      })
    })
  }

  const cancelEdit = () => {
    setEditing(false)
    setEditName(chore.name)
    setEditRecurrence(chore.recurrence)
    setEditCount(
      String(chore.recurrence === "days" ? chore.intervalDays : chore.recurrenceInterval)
    )
    setEditWeekday(String(chore.recurrenceWeekday))
    setEditMonthDay(String(chore.recurrenceMonthDay))
  }

  if (editing) {
    return (
      <div className="flex min-h-[44px] items-center gap-2 py-3">
        <input
          className="min-w-0 flex-1 rounded border border-border bg-transparent px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave()
            if (e.key === "Escape") cancelEdit()
          }}
          autoFocus
        />
        <RecurrenceFields
          recurrence={editRecurrence}
          onRecurrenceChange={setEditRecurrence}
          count={editCount}
          onCountChange={setEditCount}
          weekday={editWeekday}
          onWeekdayChange={setEditWeekday}
          monthDay={editMonthDay}
          onMonthDayChange={setEditMonthDay}
          onEnter={handleSave}
          onEscape={cancelEdit}
        />
        <Button size="icon-touch" variant="ghost" onClick={handleSave}>
          <Check className="h-4 w-4" />
        </Button>
        <Button size="icon-touch" variant="ghost" onClick={cancelEdit}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  if (confirmDelete) {
    return (
      <div className="flex items-center gap-3 py-3">
        <span className="text-sm">Delete &ldquo;{chore.name}&rdquo;?</span>
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Button size="sm" variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {roomName && (
            <Badge variant="outline" className="bg-muted/50">
              {roomName}
            </Badge>
          )}
          <span className="font-medium">{chore.name}</span>
          {!isOptimisticallyDone &&
            (overdueDays > 0 ? (
              <Badge variant="destructive">
                Overdue · {formatDueDate(dueDate, now, timeZone, dateFormat)}
              </Badge>
            ) : daysUntilDue === 0 ? (
              <Badge variant="outline" className="border-amber-500 text-amber-600">
                Due today
              </Badge>
            ) : (
              <Badge variant="secondary">
                Due {formatDueDate(dueDate, now, timeZone, dateFormat)}
              </Badge>
            ))}
        </span>
        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
          <span>{describeRecurrence(chore)}</span>
          {lastDoneText && (
            <>
              <span aria-hidden="true">·</span>
              <span>{lastDoneText}</span>
            </>
          )}
        </span>
      </div>
      <div className="flex w-full items-center gap-1 sm:w-auto sm:shrink-0">
        <Button
          size="lg"
          className="flex-1 text-sm sm:flex-initial sm:text-base"
          variant={isOptimisticallyDone ? "secondary" : "default"}
          disabled={isOptimisticallyDone}
          onClick={() => onMarkDone(chore.id)}
        >
          {isOptimisticallyDone ? "Done" : "Mark Done"}
        </Button>
        <Button
          size="icon-touch"
          variant="ghost"
          onClick={() => setEditing(true)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          size="icon-touch"
          variant="ghost"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  )
}
