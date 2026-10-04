export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  // Static import would pull `pg`/`nodemailer` into the edge runtime's graph,
  // where they cannot load; the runtime check must gate the import itself.
  const { startDigestScheduler } = await import("@/lib/digest-scheduler")
  startDigestScheduler()
}
