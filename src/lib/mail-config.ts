export type MailConfig =
  | { configured: false }
  | {
      configured: true
      host: string
      port: number
      secure: boolean
      user: string | undefined
      password: string | undefined
      from: string
    }

/**
 * SMTP settings from the environment. `SMTP_HOST` and `MAIL_FROM` are the only
 * required vars; without them mail is disabled and the digest never runs.
 */
export function getMailConfig(env: NodeJS.ProcessEnv = process.env): MailConfig {
  const host = env.SMTP_HOST?.trim()
  const from = env.MAIL_FROM?.trim()
  if (!host || !from) return { configured: false }

  const parsedPort = Number(env.SMTP_PORT ?? "587")
  const port = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 587
  return {
    configured: true,
    host,
    port,
    secure: env.SMTP_SECURE === "true" || port === 465,
    user: env.SMTP_USER?.trim() || undefined,
    password: env.SMTP_PASSWORD || undefined,
    from,
  }
}

export function isMailConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return getMailConfig(env).configured
}
