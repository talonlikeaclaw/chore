"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getDueDate, getOverdueDays } from "@/lib/chores"

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
      <Button
        size="sm"
        variant={isOptimisticallyDone ? "secondary" : "default"}
        disabled={isOptimisticallyDone}
        onClick={() => onMarkDone(chore.id)}
      >
        {isOptimisticallyDone ? "Done" : "Mark Done"}
      </Button>
    </div>
  )
}
