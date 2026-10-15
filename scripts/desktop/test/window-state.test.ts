import { expect, test } from "bun:test"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { EventEmitter } from "node:events"
import { readWindowState, restoreWindowState, trackWindowState } from "../../desktop-window-state.cjs"

const primary = { x: 0, y: 0, width: 1440, height: 860 }
const secondary = { x: -1920, y: 0, width: 1920, height: 1080 }

test("window restoration preserves normal/maximized state and corrects removed or resized displays", () => {
  const saved = { version: 1, bounds: { x: -1800, y: 100, width: 1320, height: 900 }, maximized: true }
  expect(restoreWindowState(saved, [primary, secondary])).toEqual({ bounds: saved.bounds, maximized: true })
  expect(restoreWindowState(saved, [primary])).toEqual({
    bounds: { x: 0, y: 0, width: 1320, height: 860 },
    maximized: true,
  })
  expect(restoreWindowState(saved, [{ x: 0, y: 0, width: 800, height: 600 }]).bounds).toEqual({
    x: 0,
    y: 0,
    width: 800,
    height: 600,
  })
  for (const value of [
    null,
    { ...saved, version: 2 },
    { ...saved, bounds: { ...saved.bounds, x: NaN } },
    { ...saved, bounds: { ...saved.bounds, width: 2 } },
  ]) {
    expect(restoreWindowState(value, [primary])).toEqual({
      bounds: { x: 60, y: 0, width: 1320, height: 860 },
      maximized: false,
    })
  }
})

test("closing saves normal bounds separately from maximization and corrupt files fall back safely", () => {
  const dir = mkdtempSync(join(tmpdir(), "opencode-window-"))
  const file = join(dir, "window-state.json")
  const bounds = { x: 80, y: 40, width: 1000, height: 700 }
  const window = Object.assign(new EventEmitter(), {
    isDestroyed: () => false,
    getNormalBounds: () => bounds,
    isMaximized: () => true,
  })
  try {
    writeFileSync(file, "invalid json")
    expect(readWindowState(file, [primary]).maximized).toBe(false)
    trackWindowState(window, file)
    window.emit("resize")
    window.emit("close")
    window.emit("closed")
    expect(JSON.parse(readFileSync(file, "utf8"))).toEqual({ version: 1, bounds, maximized: true })
    expect(readWindowState(file, [primary])).toEqual({ bounds, maximized: true })
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
