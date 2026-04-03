"use client"

import { useOptimistic, useTransition } from "react"
import { toast } from "sonner"
import { markDone, undoCompletion } from "@/lib/actions"
import { RoomSection } from "./room-section"

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
}

export function DashboardView({ rooms }: DashboardViewProps) {
  const [, startTransition] = useTransition()
  const [optimisticDoneIds, addOptimisticDone] = useOptimistic(
    new Set<string>(),
    (state, choreId: string) => new Set([...state, choreId])
  )

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

  if (rooms.length === 0) {
    return (
      <p className="text-center text-muted-foreground">
        No rooms yet. Add a room to get started.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {rooms.map((room) => (
        <RoomSection
          key={room.id}
          room={room}
          optimisticDoneIds={optimisticDoneIds}
          onMarkDone={handleMarkDone}
        />
      ))}
    </div>
  )
}
