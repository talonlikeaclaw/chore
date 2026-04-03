"use client"

import { UserButton } from "@daveyplate/better-auth-ui"

export function NavBar() {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <span className="font-semibold">Chore Manager</span>
        <UserButton />
      </div>
    </header>
  )
}
