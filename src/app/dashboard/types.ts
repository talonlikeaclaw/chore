import type { Recurrence } from "@/lib/chores"

export type Completion = { completedAt: Date; user: { name: string } }

export type Chore = {
  id: string
  name: string
  intervalDays: number
  recurrence: Recurrence
  recurrenceInterval: number
  recurrenceWeekday: number
  recurrenceMonthDay: number
  createdAt: Date
  completions: Completion[]
}

export type Room = { id: string; name: string; sortOrder: number; chores: Chore[] }
