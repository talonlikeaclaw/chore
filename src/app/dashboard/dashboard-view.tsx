"use client"

import { useState, useOptimistic, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, Link2, Plus, X } from "lucide-react"
import { createRoom, markDone, undoCompletion } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { RoomSection } from "./room-section"
import { getSocket } from "@/lib/socket"

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

type Room = {
  id: string
  name: string
  chores: Chore[]
}

type DashboardViewProps = {
  rooms: Room[]
  inviteCode: string
  householdId: string
}

export function DashboardView({ rooms, inviteCode, householdId }: DashboardViewProps) {
  const router = useRouter()
  const [addingRoom, setAddingRoom] = useState(false)
  const [newRoomName, setNewRoomName] = useState("")
  const [, startTransition] = useTransition()

  useEffect(() => {
    const socket = getSocket()

    socket.emit("join:household", householdId)

    const refresh = () => router.refresh()
    socket.on("chore:done", refresh)
    socket.on("chore:undone", refresh)
    socket.on("household:updated", refresh)

    return () => {
      socket.off("chore:done", refresh)
      socket.off("chore:undone", refresh)
      socket.off("household:updated", refresh)
    }
  }, [householdId, router])
  const [optimisticDoneIds, addOptimisticDone] = useOptimistic(
    new Set<string>(),
    (state, choreId: string) => new Set([...state, choreId])
  )

  const handleCopyInvite = () => {
    const url = `${window.location.origin}/join/${inviteCode}`
    navigator.clipboard.writeText(url)
    toast("Invite link copied!")
  }

  const handleMarkDone = (choreId: string) => {
    startTransition(async () => {
      addOptimisticDone(choreId)
      const result = await markDone(choreId)
      toast("Marked as done", {
        duration: 5000,
        action: {
          label: "Undo",
          onClick: () => undoCompletion(result.completionId),
        },
      })
    })
  }

  const handleAddRoom = () => {
    if (!newRoomName.trim()) return
    startTransition(async () => {
      await createRoom(newRoomName.trim())
      setNewRoomName("")
      setAddingRoom(false)
    })
  }

  const cancelAddRoom = () => {
    setAddingRoom(false)
    setNewRoomName("")
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handleCopyInvite}>
          <Link2 className="h-4 w-4" />
          Copy invite link
        </Button>
      </div>
      {rooms.length === 0 && !addingRoom && (
        <p className="text-center text-muted-foreground">
          No rooms yet. Add a room to get started.
        </p>
      )}
      {rooms.map((room) => (
        <RoomSection
          key={room.id}
          room={room}
          optimisticDoneIds={optimisticDoneIds}
          onMarkDone={handleMarkDone}
        />
      ))}
      {addingRoom ? (
        <div className="flex items-center gap-2">
          <input
            className="min-w-0 flex-1 rounded border border-border bg-transparent px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Room name"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddRoom()
              if (e.key === "Escape") cancelAddRoom()
            }}
            autoFocus
          />
          <Button size="icon-sm" variant="ghost" onClick={handleAddRoom}>
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={cancelAddRoom}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => setAddingRoom(true)}
        >
          <Plus className="h-4 w-4" />
          Add room
        </Button>
      )}
    </div>
  )
}
