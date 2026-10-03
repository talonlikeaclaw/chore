"use client"

import { useState, useTransition } from "react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { Check, ChevronDown, ChevronRight, GripVertical, Loader2, Pencil, Plus, Trash2, X } from "lucide-react"
import { getDueDate, normalizeRecurrence, type ChoreRecurrence, type Recurrence } from "@/lib/chores"
import { toast } from "sonner"
import { createChore, deleteRoom, undoDeleteRoom, updateRoom } from "@/lib/actions"
import { ChoreRow } from "./chore-row"
import { RecurrenceFields } from "@/components/recurrence-fields"
import type { Chore, Room } from "./types"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

type RoomSectionProps = {
  room: Room
  optimisticDoneIds: Set<string>
  onMarkDone: (choreId: string) => void
  isDragActive?: boolean
  timeZone: string
  now: Date
}

function sortByOverdue(chores: Chore[], timeZone: string): Chore[] {
  return [...chores].sort((a, b) => {
    const dueDateA = getDueDate(a, a.completions[0] ?? null, timeZone)
    const dueDateB = getDueDate(b, b.completions[0] ?? null, timeZone)
    return dueDateA.getTime() - dueDateB.getTime()
  })
}

export function RoomSection({ room, optimisticDoneIds, onMarkDone, isDragActive, timeZone, now }: RoomSectionProps) {
  const [open, setOpen] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [roomName, setRoomName] = useState(room.name)
  const [addingChore, setAddingChore] = useState(false)
  const [newChoreName, setNewChoreName] = useState("")
  const [newChoreRecurrence, setNewChoreRecurrence] = useState<Recurrence>("days")
  const [newChoreCount, setNewChoreCount] = useState("7")
  const [newChoreWeekday, setNewChoreWeekday] = useState("0")
  const [newChoreMonthDay, setNewChoreMonthDay] = useState("1")
  const [isPending, startTransition] = useTransition()

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: room.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const sorted = sortByOverdue(room.chores, timeZone)

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
    if (!newChoreName.trim()) {
      toast.warning("Enter a chore name")
      return
    }
    let normalized: ChoreRecurrence
    try {
      normalized = normalizeRecurrence({
        recurrence: newChoreRecurrence,
        count: parseInt(newChoreCount, 10),
        weekday: parseInt(newChoreWeekday, 10),
        monthDay: parseInt(newChoreMonthDay, 10),
      })
    } catch (error) {
      toast.warning(error instanceof Error ? error.message : "Invalid recurrence")
      return
    }
    startTransition(async () => {
      await createChore(room.id, newChoreName.trim(), normalized)
      setNewChoreName("")
      setNewChoreRecurrence("days")
      setNewChoreCount("7")
      setNewChoreWeekday("0")
      setNewChoreMonthDay("1")
      setAddingChore(false)
    })
  }

  const cancelAddChore = () => {
    setAddingChore(false)
    setNewChoreName("")
    setNewChoreRecurrence("days")
    setNewChoreCount("7")
    setNewChoreWeekday("0")
    setNewChoreMonthDay("1")
  }

  const header = (() => {
    if (editingName) {
      return (
        <div className="flex min-h-[44px] items-center gap-2 py-2">
          <input
            className="min-w-0 flex-1 rounded border border-border bg-transparent px-2 py-1 text-sm text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveRoom()
              if (e.key === "Escape") cancelEditRoom()
            }}
            autoFocus
          />
          <Button size="icon-touch" variant="ghost" onClick={handleSaveRoom}>
            <Check className="h-4 w-4" />
          </Button>
          <Button size="icon-touch" variant="ghost" onClick={cancelEditRoom}>
            <X className="h-4 w-4" />
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
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Button size="sm" variant="destructive" onClick={handleDeleteRoom}>
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
      <div className="flex items-center">
        <button
          className="shrink-0 rounded p-1 hover:bg-muted"
          style={{ touchAction: "none" }}
          {...attributes}
          {...listeners}
          suppressHydrationWarning
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <CollapsibleTrigger className="flex flex-1 items-center gap-2 rounded-md py-2 font-semibold hover:text-muted-foreground">
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )}
          {room.name}
        </CollapsibleTrigger>
        <Button
          size="icon-touch"
          variant="ghost"
          onClick={() => setEditingName(true)}
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
    )
  })()

  if (isDragActive) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="opacity-50"
      >
        <div className="flex items-center py-2 font-semibold">
          <GripVertical className="mr-1 h-4 w-4 text-muted-foreground" />
          {room.name}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        {header}
        <CollapsibleContent>
          <div className="divide-y rounded-md border px-4">
            {sorted.length === 0 && !addingChore && (
              <p className="py-3 text-sm text-muted-foreground">
                No chores yet
              </p>
            )}
            {sorted.map((chore) => (
              <ChoreRow
                key={chore.id}
                chore={chore}
                isOptimisticallyDone={optimisticDoneIds.has(chore.id)}
                onMarkDone={onMarkDone}
                timeZone={timeZone}
                now={now}
              />
            ))}
            {addingChore ? (
              <div className="flex min-h-[44px] items-center gap-2 py-3">
                <input
                  className="min-w-0 flex-1 rounded border border-border bg-transparent px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Chore name"
                  value={newChoreName}
                  onChange={(e) => setNewChoreName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddChore()
                    if (e.key === "Escape") cancelAddChore()
                  }}
                  autoFocus
                />
                <RecurrenceFields
                  recurrence={newChoreRecurrence}
                  onRecurrenceChange={setNewChoreRecurrence}
                  count={newChoreCount}
                  onCountChange={setNewChoreCount}
                  weekday={newChoreWeekday}
                  onWeekdayChange={setNewChoreWeekday}
                  monthDay={newChoreMonthDay}
                  onMonthDayChange={setNewChoreMonthDay}
                  onEnter={handleAddChore}
                  onEscape={cancelAddChore}
                />
                <Button size="icon-touch" variant="ghost" onClick={handleAddChore}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="icon-touch" variant="ghost" onClick={cancelAddChore}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                className="flex min-h-[44px] w-full items-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setAddingChore(true)}
              >
                <Plus className="h-4 w-4" />
                Add chore
              </button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
