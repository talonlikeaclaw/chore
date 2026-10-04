import nodemailer, { type Transporter } from "nodemailer"

import { getMailConfig } from "./mail-config"

let transport: Transporter | null = null

/**
 * Sends one message per recipient. Transport settings are read from the
 * environment on the first call and reused; changing `SMTP_*` needs a restart.
 */
export async function sendMail(input: {
  to: string
  subject: string
  html: string
  text: string
}): Promise<void> {
  const config = getMailConfig()
  if (!config.configured) throw new Error("SMTP is not configured")

  if (!transport) {
    transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user ? { user: config.user, pass: config.password } : undefined,
    })
  }

  await transport.sendMail({
    from: config.from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  })
}
