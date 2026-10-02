"use client"

import { House } from "lucide-react"
import { UserButton } from "@daveyplate/better-auth-ui"

export function NavBar() {
  return (
    <header className="border-b pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <span className="font-semibold">chore</span>
        <UserButton
          size="icon"
          // "Account" is the destination's own first tab; "Household" is ours,
          // so the menu never shows two entries both called "Settings".
          localization={{ SETTINGS: "Account" }}
          additionalLinks={[
            {
              href: "/household",
              icon: <House className="h-4 w-4" />,
              label: "Household",
            },
          ]}
        />
      </div>
    </header>
  )
}
