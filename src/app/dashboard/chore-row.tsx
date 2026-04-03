"use client"

import { useState, useTransition } from "react"
import { Check, Pencil, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getDueDate, getOverdueDays } from "@/lib/chores"
import { updateChore, deleteChore } from "@/lib/actions"

type ChoreRowProps = {
  chore: {
    id: string
    name: string
    intervalDays: number
    createdAt: Date
    completions: Array<{
      completedAt: Date
      user: { name: string }
    }>
  }
  isOptimisticallyDone: boolean
  onMarkDone: (choreId: string) => void
}

export function ChoreRow({ chore, isOptimisticallyDone, onMarkDone }: ChoreRowProps) {
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editName, setEditName] = useState(chore.name)
  const [editInterval, setEditInterval] = useState(String(chore.intervalDays))
  const [, startTransition] = useTransition()

  const lastCompletion = chore.completions[0] ?? null
  const dueDate = getDueDate(chore, lastCompletion)
  const overdueDays = isOptimisticallyDone ? 0 : getOverdueDays(dueDate)
  const daysUntilDue = Math.ceil(
    (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )

  const lastDoneText = (() => {
    if (isOptimisticallyDone) return "Just completed"
    if (!lastCompletion) return null
    const daysAgo = Math.floor(
      (Date.now() - lastCompletion.completedAt.getTime()) / (1000 * 60 * 60 * 24)
    )
    const when = daysAgo === 0 ? "today" : `${daysAgo}d ago`
    return `Last done by ${lastCompletion.user.name} ${when}`
  })()

  const handleSave = () => {
    const interval = parseInt(editInterval, 10)
    if (!editName.trim() || !interval || interval < 1) return
    startTransition(async () => {
      await updateChore(chore.id, editName.trim(), interval)
      setEditing(false)
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      await deleteChore(chore.id)
    })
  }

  const cancelEdit = () => {
    setEditing(false)
    setEditName(chore.name)
    setEditInterval(String(chore.intervalDays))
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-3">
        <input
          className="min-w-0 flex-1 rounded border border-border bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave()
            if (e.key === "Escape") cancelEdit()
          }}
          autoFocus
        />
        <input
          className="w-14 rounded border border-border bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          type="number"
          min="1"
          value={editInterval}
          onChange={(e) => setEditInterval(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave()
            if (e.key === "Escape") cancelEdit()
          }}
        />
        <span className="shrink-0 text-xs text-muted-foreground">days</span>
        <Button size="icon-sm" variant="ghost" onClick={handleSave}>
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={cancelEdit}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }

  if (confirmDelete) {
    return (
      <div className="flex items-center gap-3 py-3">
        <span className="text-sm">Delete &ldquo;{chore.name}&rdquo;?</span>
        <Button size="sm" variant="destructive" onClick={handleDelete}>
          Delete
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
          Cancel
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex flex-col gap-1">
        <span className="font-medium">{chore.name}</span>
        <div className="flex flex-wrap items-center gap-2">
          {overdueDays > 0 ? (
            <Badge variant="destructive">{overdueDays}d overdue</Badge>
          ) : isOptimisticallyDone || daysUntilDue > 0 ? (
            <Badge variant="secondary">
              {isOptimisticallyDone
                ? `Due in ${chore.intervalDays}d`
                : `Due in ${daysUntilDue}d`}
            </Badge>
          ) : (
            <Badge variant="outline" className="border-amber-500 text-amber-600">
              Due today
            </Badge>
          )}
          {lastDoneText && (
            <span className="text-xs text-muted-foreground">{lastDoneText}</span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          size="sm"
          variant={isOptimisticallyDone ? "secondary" : "default"}
          disabled={isOptimisticallyDone}
          onClick={() => onMarkDone(chore.id)}
        >
          {isOptimisticallyDone ? "Done" : "Mark Done"}
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => setEditing(true)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>
    </div>
  )
}
