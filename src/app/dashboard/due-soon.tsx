"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { getDueBucket, getDueDate, type DueBucket } from "@/lib/chores"
import { ChoreRow } from "./chore-row"
import type { Room } from "./types"

type DueSoonProps = {
  rooms: Room[]
  optimisticDoneIds: Set<string>
  onMarkDone: (choreId: string) => void
  timeZone: string
  now: Date
}

const BUCKETS: ReadonlyArray<{ key: DueBucket; label: string }> = [
  { key: "overdue", label: "Overdue" },
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
]

export function DueSoon({
  rooms,
  optimisticDoneIds,
  onMarkDone,
  timeZone,
  now,
}: DueSoonProps) {
  const [open, setOpen] = useState(true)

  const buckets = BUCKETS.map((bucket) => ({
    ...bucket,
    items: rooms
      .flatMap((room) =>
        room.chores.map((chore) => {
          const dueDate = getDueDate(chore, chore.completions[0] ?? null, timeZone)
          return {
            chore,
            roomName: room.name,
            dueDate,
            bucket: getDueBucket(dueDate, now, timeZone),
          }
        })
      )
      .filter((item) => item.bucket === bucket.key)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()),
  }))

  const total = buckets.reduce((sum, bucket) => sum + bucket.items.length, 0)
  if (total === 0) return null

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md py-2 font-semibold hover:text-muted-foreground">
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        Due soon
        <span className="text-xs font-normal text-muted-foreground">{total}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {buckets.map(({ key, label, items }) =>
          items.length === 0 ? null : (
            <div key={key}>
              <h3 className="px-1 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {label} · {items.length}
              </h3>
              <div className="divide-y rounded-md border px-4">
                {items.map(({ chore, roomName }) => (
                  <ChoreRow
                    key={chore.id}
                    chore={chore}
                    roomName={roomName}
                    isOptimisticallyDone={optimisticDoneIds.has(chore.id)}
                    onMarkDone={onMarkDone}
                    timeZone={timeZone}
                    now={now}
                  />
                ))}
              </div>
            </div>
          )
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
