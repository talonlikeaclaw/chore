import type { Metadata, Viewport } from "next"
import { Toaster } from "@/components/ui/sonner"
import { APP_VERSION } from "@/lib/version"
import { Providers } from "./providers"
import "./globals.css"

export const metadata: Metadata = {
  title: "Chore Manager",
  description: "Household chore tracker",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark h-full antialiased" style={{ fontFamily: "var(--font-maple-mono)" }}>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
        <Toaster />
        <footer className="mt-auto border-t border-border px-4 py-3 text-center text-xs text-muted-foreground">
          {APP_VERSION}
        </footer>
      </body>
    </html>
  )
}
