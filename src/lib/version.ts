/** Build/runtime app version, injected as APP_VERSION. Falls back to "dev". */
export const APP_VERSION = process.env.APP_VERSION?.trim() || "dev"
