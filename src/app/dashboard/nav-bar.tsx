"use client"

import { UserButton } from "@daveyplate/better-auth-ui"

export function NavBar() {
  return (
    <header className="border-b pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <span className="font-semibold">chore</span>
        <UserButton size="icon" />
      </div>
    </header>
  )
}
