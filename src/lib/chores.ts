export type LastCompletion = {
  completedAt: Date
}

export type ChoreBase = {
  createdAt: Date
  intervalDays: number
}

/**
 * Returns the date a chore is due.
 * If never completed, due date is the chore's creation date.
 * If completed, due date is last completion + intervalDays.
 */
export function getDueDate(
  chore: ChoreBase,
  lastCompletion: LastCompletion | null
): Date {
  if (!lastCompletion) {
    return chore.createdAt
  }
  const due = new Date(lastCompletion.completedAt)
  due.setDate(due.getDate() + chore.intervalDays)
  return due
}

/**
 * Returns how many whole days a chore is past its due date.
 * Returns 0 if not overdue.
 */
export function getOverdueDays(dueDate: Date): number {
  const now = new Date()
  const diffMs = now.getTime() - dueDate.getTime()
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}
