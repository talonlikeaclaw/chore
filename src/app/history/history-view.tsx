"use client"

import { useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"

import { getSocket } from "@/lib/socket"
import type {
  CadenceRow,
  HistoryTotals,
  LogGroup,
  MemberTotal,
  RoomTotal,
  WeekBucket,
} from "@/lib/history"

type HistoryViewProps = {
  householdId: string
  householdName: string
  totals: HistoryTotals
  memberTotals: MemberTotal[]
  roomTotals: RoomTotal[]
  cadence: CadenceRow[]
  weeks: WeekBucket[]
  log: { groups: LogGroup[]; truncated: boolean; total: number }
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  )
}

export function HistoryView({
  householdId,
  householdName,
  totals,
  memberTotals,
  roomTotals,
  cadence,
  weeks,
  log,
}: HistoryViewProps) {
  const router = useRouter()

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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">History</h1>
        <p className="text-sm text-muted-foreground">{householdName}</p>
      </div>

      {log.total === 0 ? (
        <p className="text-center text-muted-foreground">No completions yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-md border p-3">
              <p className="text-xl font-semibold tabular-nums">{totals.total}</p>
              <p className="text-xs text-muted-foreground">All time</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xl font-semibold tabular-nums">{totals.last7Days}</p>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xl font-semibold tabular-nums">{totals.last30Days}</p>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </div>
          </div>

          <Section title="By member">
            {memberTotals.map((member) => (
              <div key={member.userId} className="flex justify-between">
                <span>{member.name}</span>
                <span className="tabular-nums">{member.count}</span>
              </div>
            ))}
          </Section>

          {roomTotals.length > 0 && (
            <Section title="By room">
              {roomTotals.map((room) => (
                <div key={room.roomId} className="flex justify-between">
                  <span>{room.name}</span>
                  <span className="tabular-nums">{room.count}</span>
                </div>
              ))}
            </Section>
          )}

          {cadence.length > 0 && (
            <Section title="Cadence">
              {cadence.map((row) => (
                <div key={row.choreId} className="flex justify-between gap-2">
                  <span>
                    {row.choreName}{" "}
                    <span className="text-xs text-muted-foreground">{row.roomName}</span>
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    every {row.actualDays.toFixed(1)}d vs {row.targetDays}d target
                  </span>
                </div>
              ))}
            </Section>
          )}

          <Section title="Last 8 weeks">
            {weeks.map((bucket) => (
              <div key={bucket.start.getTime()} className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-xs text-muted-foreground">{bucket.label}</span>
                <div className="h-2 flex-1 rounded bg-muted">
                  <div
                    className="h-full rounded bg-foreground"
                    style={{ width: `${Math.round(bucket.ratio * 100)}%` }}
                  />
                </div>
                <span className="w-6 text-right text-xs tabular-nums">{bucket.count}</span>
              </div>
            ))}
          </Section>

          <div className="flex flex-col gap-4">
            {log.groups.map((group) => (
              <div key={group.key}>
                <h2 className="text-sm font-medium text-muted-foreground">{group.label}</h2>
                {group.entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-4 border-b border-border py-2 last:border-0"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="w-12 shrink-0 tabular-nums text-muted-foreground">
                        {entry.timeLabel}
                      </span>
                      <span className="font-medium">{entry.choreName}</span>
                      <span className="truncate text-xs text-muted-foreground">{entry.roomName}</span>
                    </span>
                    <span className="shrink-0 text-sm text-muted-foreground">{entry.userName}</span>
                  </div>
                ))}
              </div>
            ))}
            {log.truncated && (
              <p className="text-xs text-muted-foreground">
                Showing the most recent 100 of {log.total} completions.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
