import { expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { createStore } from "solid-js/store"
import { createMessageNavigation } from "../src/extensions/session-navigation"
import { createSessionNavigation } from "../src/extensions/session-navigation-state"

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

test("history previews show the selected prompt's text response without crossing a shell or later prompt", () => {
  const root = createRoot((dispose) => {
    const messages = [
      { id: "a", type: "user", text: "First prompt" },
      {
        id: "a-reply",
        type: "assistant",
        content: [
          { type: "reasoning", text: "Hidden reasoning" },
          { type: "text", text: "First answer" },
        ],
      },
      { id: "shell", type: "shell" },
      { id: "shell-reply", type: "assistant", content: [{ type: "text", text: "Shell answer" }] },
      { id: "b", type: "user", text: "Second prompt" },
      { id: "b-reply", type: "assistant", content: [{ type: "text", text: "Second answer" }] },
    ]
    const session = {
      identity: { sessionKey: () => "one" },
      history: {
        visibleUserMessages: () => messages.filter((message) => message.type === "user"),
        messages: () => messages,
      },
    } as unknown as Parameters<typeof createSessionNavigation>[0]
    const timeline = {
      scroller: () => undefined,
      view: { unpin: () => {} },
      actions: { revealMessage: () => {} },
    } as unknown as Parameters<typeof createSessionNavigation>[1]
    return { ...createSessionNavigation(session, timeline), dispose }
  })
  try {
    expect(root.previewResponse()).toBe("")
    root.navigation.point(0, false)
    expect(root.previewResponse()).toBe("First answer")
    root.navigation.point(1, false)
    expect(root.previewResponse()).toBe("Second answer")
    root.navigation.leave()
    expect(root.previewResponse()).toBe("")
  } finally {
    root.dispose()
  }
})

test("continued history search stops on matches or its page limit and ignores errors after ownership changes", async () => {
  const root = createRoot((dispose) => {
    const [state, setState] = createStore({ key: "local:one", loading: false, pages: 0, matches: 0 })
    let wait: (() => Promise<void>) | undefined
    const session = {
      identity: { sessionKey: () => state.key, sessionID: () => "one" },
      ownership: {
        capture: () => {
          const key = state.key
          return { current: () => state.key === key }
        },
      },
      history: { visibleUserMessages: () => [], messages: () => [] },
      shared: {
        data: {
          session: {
            message: {
              more: () => true,
              loading: () => state.loading,
              loadMore: async () => {
                setState({ loading: true, pages: state.pages + 1 })
                try {
                  await wait?.()
                } finally {
                  setState("loading", false)
                }
              },
            },
          },
        },
      },
    } as unknown as Parameters<typeof createSessionNavigation>[0]
    const timeline = {
      scroller: () => undefined,
      view: { unpin: () => {} },
      actions: { revealMessage: () => {} },
    } as unknown as Parameters<typeof createSessionNavigation>[1]
    return {
      ...createSessionNavigation(session, timeline),
      dispose,
      state,
      setState,
      setWait: (value: typeof wait) => {
        wait = value
      },
    }
  })
  try {
    await root.history.searchMore(() => root.state.matches)
    expect(root.state.pages).toBe(5)
    root.setWait(async () => {
      root.setState("matches", 1)
    })
    await root.history.searchMore(() => root.state.matches)
    expect(root.state.pages).toBe(6)
    let reject!: (error: Error) => void
    root.setWait(
      () =>
        new Promise((_, fail) => {
          reject = fail
        }),
    )
    const pending = root.history.searchMore(() => root.state.matches)
    root.history.cancel()
    reject(new Error("current request failed"))
    await pending
    expect(root.state.pages).toBe(7)
    expect(root.history.continuing).toBe(false)
    expect(root.history.error).toBe(true)
    const stale = root.history.searchMore(() => root.state.matches)
    root.setState("key", "remote:one")
    reject(new Error("previous server failed"))
    await stale
    expect(root.history.error).toBe(false)
    expect(root.history.continuing).toBe(false)
  } finally {
    root.dispose()
  }
})
