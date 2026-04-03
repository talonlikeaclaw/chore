"use client"

import { useState } from "react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight } from "lucide-react"
import { getDueDate, getOverdueDays } from "@/lib/chores"
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
    const overdueA = getOverdueDays(dueDateA)
    const overdueB = getOverdueDays(dueDateB)
    return overdueB - overdueA
  })
}

export function RoomSection({ room, optimisticDoneIds, onMarkDone }: RoomSectionProps) {
  const [open, setOpen] = useState(true)
  const sorted = sortByOverdue(room.chores)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md py-2 font-semibold hover:text-muted-foreground">
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        {room.name}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="divide-y rounded-md border px-4">
          {sorted.length === 0 ? (
            <p className="py-3 text-sm text-muted-foreground">
              No chores in this room.
            </p>
          ) : (
            sorted.map((chore) => (
              <ChoreRow
                key={chore.id}
                chore={chore}
                isOptimisticallyDone={optimisticDoneIds.has(chore.id)}
                onMarkDone={onMarkDone}
              />
            ))
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
