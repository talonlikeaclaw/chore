"use client"

import { useState, useTransition } from "react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { Check, ChevronDown, ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react"
import { getDueDate, getOverdueDays } from "@/lib/chores"
import { toast } from "sonner"
import { createChore, deleteRoom, undoDeleteRoom, updateRoom } from "@/lib/actions"
import { ChoreRow } from "./chore-row"

type Chore = {
  id: string
  name: string
  intervalDays: number
  createdAt: Date
  completions: Array<{
    completedAt: Date
    user: { name: string }
  }>
}

type RoomSectionProps = {
  room: {
    id: string
    name: string
    chores: Chore[]
  }
  optimisticDoneIds: Set<string>
  onMarkDone: (choreId: string) => void
}

function sortByOverdue(chores: Chore[]): Chore[] {
  return [...chores].sort((a, b) => {
    const dueDateA = getDueDate(a, a.completions[0] ?? null)
    const dueDateB = getDueDate(b, b.completions[0] ?? null)
    return getOverdueDays(dueDateB) - getOverdueDays(dueDateA)
  })
}

export function RoomSection({ room, optimisticDoneIds, onMarkDone }: RoomSectionProps) {
  const [open, setOpen] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [roomName, setRoomName] = useState(room.name)
  const [addingChore, setAddingChore] = useState(false)
  const [newChoreName, setNewChoreName] = useState("")
  const [newChoreInterval, setNewChoreInterval] = useState("")
  const [, startTransition] = useTransition()

  const sorted = sortByOverdue(room.chores)

  const handleSaveRoom = () => {
    if (!roomName.trim()) return
    startTransition(async () => {
      await updateRoom(room.id, roomName.trim())
      setEditingName(false)
    })
  }

  const cancelEditRoom = () => {
    setEditingName(false)
    setRoomName(room.name)
  }

  const handleDeleteRoom = () => {
    startTransition(async () => {
      const deleted = await deleteRoom(room.id)
      toast(`"${deleted.name}" deleted`, {
        duration: 5000,
        action: {
          label: "Undo",
          onClick: () => undoDeleteRoom(deleted),
        },
      })
    })
  }

  const handleAddChore = () => {
    const interval = parseInt(newChoreInterval, 10)
    if (!newChoreName.trim() || !interval || interval < 1) return
    startTransition(async () => {
      await createChore(room.id, newChoreName.trim(), interval)
      setNewChoreName("")
      setNewChoreInterval("")
      setAddingChore(false)
    })
  }

  const cancelAddChore = () => {
    setAddingChore(false)
    setNewChoreName("")
    setNewChoreInterval("")
  }

  const header = (() => {
    if (editingName) {
      return (
        <div className="flex items-center gap-2 py-2">
          <input
            className="min-w-0 flex-1 rounded border border-border bg-transparent px-2 py-1 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveRoom()
              if (e.key === "Escape") cancelEditRoom()
            }}
            autoFocus
          />
          <Button size="icon-sm" variant="ghost" onClick={handleSaveRoom}>
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={cancelEditRoom}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )
    }

    if (confirmDelete) {
      return (
        <div className="flex items-center gap-3 py-2">
          <span className="text-sm">
            Delete &ldquo;{room.name}&rdquo; and all its chores?
          </span>
          <Button size="sm" variant="destructive" onClick={handleDeleteRoom}>
            Delete
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
        </div>
      )
    }

    return (
      <div className="flex items-center">
        <CollapsibleTrigger className="flex flex-1 items-center gap-2 rounded-md py-2 font-semibold hover:text-muted-foreground">
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )}
          {room.name}
        </CollapsibleTrigger>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => setEditingName(true)}
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
    )
  })()

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      {header}
      <CollapsibleContent>
        <div className="divide-y rounded-md border px-4">
          {sorted.map((chore) => (
            <ChoreRow
              key={chore.id}
              chore={chore}
              isOptimisticallyDone={optimisticDoneIds.has(chore.id)}
              onMarkDone={onMarkDone}
            />
          ))}
          {addingChore ? (
            <div className="flex items-center gap-2 py-3">
              <input
                className="min-w-0 flex-1 rounded border border-border bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Chore name"
                value={newChoreName}
                onChange={(e) => setNewChoreName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddChore()
                  if (e.key === "Escape") cancelAddChore()
                }}
                autoFocus
              />
              <input
                className="w-14 rounded border border-border bg-transparent px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                type="number"
                min="1"
                placeholder="7"
                value={newChoreInterval}
                onChange={(e) => setNewChoreInterval(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddChore()
                  if (e.key === "Escape") cancelAddChore()
                }}
              />
              <span className="shrink-0 text-xs text-muted-foreground">days</span>
              <Button size="icon-sm" variant="ghost" onClick={handleAddChore}>
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon-sm" variant="ghost" onClick={cancelAddChore}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <button
              className="flex w-full items-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setAddingChore(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add chore
            </button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
