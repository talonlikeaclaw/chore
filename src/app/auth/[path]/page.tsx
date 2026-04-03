import { AuthView } from "@daveyplate/better-auth-ui"
import { authViewPaths } from "@daveyplate/better-auth-ui/server"

export const dynamicParams = false

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }))
}

export default async function AuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ path: string }>
  searchParams: Promise<{ redirectTo?: string }>
}) {
  const { path } = await params
  const { redirectTo } = await searchParams

  return (
    <main className="container flex grow flex-col items-center justify-center self-center p-4 md:p-6">
      <AuthView path={path} redirectTo={redirectTo ?? "/dashboard"} />
    </main>
  )
}
