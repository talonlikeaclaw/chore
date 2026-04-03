import type { ReactNode } from "react"
import { NavBar } from "./nav-bar"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <NavBar />
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        {children}
      </div>
    </div>
  )
}
