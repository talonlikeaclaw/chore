"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { switchHousehold } from "@/lib/actions"

export function JoinSwitch({
  inviteCode,
  currentName,
  targetName,
  isSoleMember,
}: {
  inviteCode: string
  currentName: string
  targetName: string
  isSoleMember: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleSwitch = () =>
    startTransition(async () => {
      try {
        await switchHousehold(inviteCode)
        router.push("/dashboard")
        router.refresh()
      } catch {
        toast.error("Could not switch households")
      }
    })

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-bold">Already in a household</h1>
      <p className="text-muted-foreground">
        You&apos;re currently in <strong>{currentName}</strong>.{" "}
        {isSoleMember ? (
          <>
            Switching will delete <strong>{currentName}</strong> and its rooms
            and chores.
          </>
        ) : (
          <>
            Switching will leave <strong>{currentName}</strong>.
          </>
        )}
      </p>
      <Button variant="destructive" onClick={handleSwitch} disabled={isPending}>
        {isPending
          ? "Switching…"
          : `${isSoleMember ? "Delete" : "Leave"} ${currentName} and join ${targetName}`}
      </Button>
      <Link
        href="/dashboard"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        Cancel
      </Link>
    </main>
  )
}
