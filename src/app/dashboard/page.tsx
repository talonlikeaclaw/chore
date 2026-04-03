import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { desc, eq } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { db } from "@/db"
import { chores, completions } from "@/db/schema"
import { DashboardView } from "./dashboard-view"

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/auth/sign-in")

  const rooms = await db.query.rooms.findMany({
    with: {
      chores: {
        where: eq(chores.active, true),
        with: {
          completions: {
            orderBy: [desc(completions.completedAt)],
            limit: 1,
            with: {
              user: {
                columns: { name: true },
              },
            },
          },
        },
      },
    },
  })

  return <DashboardView rooms={rooms} />
}
