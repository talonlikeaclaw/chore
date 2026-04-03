import Link from "next/link"

export default function WelcomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Chore Manager</h1>
      <p className="max-w-sm text-muted-foreground">
        Keep your home running smoothly. Track chores, see what&apos;s overdue,
        and stay in sync with your household.
      </p>
      <Link
        href="/auth/sign-in"
        className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/80"
      >
        Sign in
      </Link>
    </main>
  )
}
