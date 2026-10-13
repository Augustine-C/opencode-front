import { expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { createStore } from "solid-js/store"
import { createMessageNavigation } from "../src/extensions/session-navigation"

function fixture() {
  const originalRequest = globalThis.requestAnimationFrame
  const originalCancel = globalThis.cancelAnimationFrame
  const frames = new Map<number, FrameRequestCallback>()
  let nextFrame = 0
  globalThis.requestAnimationFrame = (callback) => {
    frames.set(++nextFrame, callback)
    return nextFrame
  }
  globalThis.cancelAnimationFrame = (id) => {
    frames.delete(id)
  }
  const reveals: string[] = []
  let unpins = 0
  const root = createRoot((dispose) => {
    const [state, setState] = createStore({
      key: "one",
      messages: [
        { id: "a", text: "First" },
        { id: "b", text: "Second" },
        { id: "c", text: "Third" },
      ],
    })
    const navigation = createMessageNavigation({
      sessionKey: () => state.key,
      messages: () => state.messages,
      scroller: () => undefined,
      unpin: () => {
        unpins++
      },
      reveal: (id) => reveals.push(id),
    })
    return { navigation, setState, dispose }
  })
  return {
    ...root,
    reveals,
    frames,
    unpins: () => unpins,
    flush: () => {
      const queued = [...frames.values()]
      frames.clear()
      queued.forEach((callback) => callback(0))
    },
    cleanup: () => {
      root.dispose()
      globalThis.requestAnimationFrame = originalRequest
      globalThis.cancelAnimationFrame = originalCancel
    },
  }
}

test("history gestures clamp to loaded prompts and coalesce reveals while hover only previews", () => {
  const f = fixture()
  try {
    f.navigation.point(-1, false)
    expect(f.navigation.preview()?.id).toBe("a")
    expect(f.reveals).toEqual([])
    f.navigation.start()
    f.navigation.point(-1, true)
    f.navigation.point(0.5, true)
    f.navigation.point(2, true)
    expect(f.frames.size).toBe(1)
    f.flush()
    expect(f.reveals).toEqual(["c"])
    expect(f.unpins()).toBe(1)
    f.navigation.select(-10)
    f.navigation.finish()
    expect(f.reveals).toEqual(["c", "a"])
    expect(f.frames.size).toBe(0)
    expect(f.navigation.state.dragging).toBe(false)
    expect(f.navigation.preview()).toBeUndefined()
  } finally {
    f.cleanup()
  }
})

test("session switching and disposal cancel pending history navigation without revealing stale prompts", () => {
  const f = fixture()
  try {
    f.navigation.select(0)
    f.setState({ key: "two", messages: [{ id: "new", text: "New session" }] })
    expect(f.frames.size).toBe(0)
    f.flush()
    expect(f.reveals).toEqual([])
    expect(f.navigation.preview()).toBeUndefined()
    expect(f.navigation.activeIndex()).toBe(0)
    f.navigation.select(0)
    f.dispose()
    f.flush()
    expect(f.reveals).toEqual([])
    expect(f.frames.size).toBe(0)
  } finally {
    f.cleanup()
  }
})
