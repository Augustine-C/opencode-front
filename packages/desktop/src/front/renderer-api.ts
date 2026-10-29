export type NativeDesktop = {
  os: "macos" | "windows" | "linux"
  windowID: string
  packaged: boolean
  invoke(method: string, input?: unknown, request?: string): Promise<unknown>
  cancel(request: string): void
  on(listener: (event: { _tag: string; [key: string]: unknown }) => void): () => void
}
declare global {
  interface Window {
    electron?: NativeDesktop
  }
}
export const api = { getWindowBootstrap: () => ({ packaged: window.electron?.packaged ?? false }) }

/** Electron preserves cloneable envelopes; reconstruct errors here so the official bridge keeps failure codes. */
export async function invokeNative(method: string, input?: unknown, request?: string): Promise<unknown> {
  if (!window.electron) throw new Error("Desktop bridge unavailable")
  const reply = (await window.electron.invoke(method, input, request)) as {
    ok: boolean
    value?: unknown
    error?: { code: string; message?: string }
  }
  if (!reply.ok)
    throw Object.assign(new Error(reply.error?.message ?? "failed"), { code: reply.error?.code ?? "failed" })
  return reply.value
}
