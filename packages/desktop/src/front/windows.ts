import { BrowserWindow } from "electron"
const listeners = new Set<(window: BrowserWindow) => void>()
const windows = new Set<BrowserWindow>()
let focused: BrowserWindow | undefined
export const getMainWindows = () => [...windows].filter((window) => !window.isDestroyed())
export const getLastFocusedWindow = () => (focused && !focused.isDestroyed() ? focused : getMainWindows()[0])
export function onMainWindow(listener: (window: BrowserWindow) => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
export function registerWindow(window: BrowserWindow) {
  windows.add(window)
  window.on("focus", () => {
    focused = window
  })
  window.once("closed", () => {
    windows.delete(window)
  })
  listeners.forEach((listener) => listener(window))
}
