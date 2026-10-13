import { createEffect, createMemo, on, onCleanup, type Accessor } from "solid-js"
import { createStore } from "solid-js/store"

type Message = { id: string; text: string }

export function createMessageNavigation(input: {
  sessionKey: Accessor<string>
  messages: Accessor<readonly Message[]>
  scroller: Accessor<HTMLDivElement | undefined>
  unpin: () => void
  reveal: (id: string) => void
}) {
  const [state, setState] = createStore({ activeID: "", previewID: "", dragging: false, visible: true })
  const indexes = createMemo(() => new Map(input.messages().map((message, index) => [message.id, index])))
  const activeIndex = createMemo(() => indexes().get(state.activeID) ?? Math.max(0, input.messages().length - 1))
  const preview = createMemo(() => {
    const index = indexes().get(state.previewID)
    return index === undefined ? undefined : input.messages()[index]
  })
  let frame: number | undefined
  let pendingID = ""
  const cancel = () => {
    if (frame !== undefined) cancelAnimationFrame(frame)
    frame = undefined
    pendingID = ""
  }
  const flush = () => {
    frame = undefined
    const id = pendingID
    pendingID = ""
    if (!indexes().has(id)) return
    input.unpin()
    input.reveal(id)
  }
  const select = (index: number) => {
    const message = input.messages()[Math.max(0, Math.min(input.messages().length - 1, index))]
    if (!message) return
    setState({ activeID: message.id, previewID: message.id })
    if (pendingID === message.id) return
    pendingID = message.id
    if (frame === undefined) frame = requestAnimationFrame(flush)
  }
  const point = (position: number, navigate: boolean) => {
    const index = Math.round(Math.max(0, Math.min(1, position)) * (input.messages().length - 1))
    if (navigate) select(index)
    else setState("previewID", input.messages()[index]?.id ?? "")
  }
  createEffect(
    on(input.sessionKey, () => {
      cancel()
      setState({ activeID: "", previewID: "", dragging: false })
    }),
  )
  createEffect(() => {
    const root = input.scroller()
    if (!root) return
    let scrollFrame: number | undefined
    const update = () => {
      scrollFrame = undefined
      if (state.dragging || pendingID) return
      if (root.scrollHeight - root.clientHeight - root.scrollTop <= 2) {
        setState("activeID", input.messages().at(-1)?.id ?? "")
        return
      }
      const bounds = root.getBoundingClientRect()
      for (const row of root.querySelectorAll<HTMLElement>("[data-message-id]")) {
        const rect = row.getBoundingClientRect()
        if (rect.bottom <= bounds.top || rect.top >= bounds.bottom) continue
        const id = row.dataset.messageId ?? ""
        if (!indexes().has(id)) continue
        setState("activeID", id)
        break
      }
    }
    const schedule = () => {
      if (scrollFrame === undefined) scrollFrame = requestAnimationFrame(update)
    }
    root.addEventListener("scroll", schedule, { passive: true })
    schedule()
    onCleanup(() => {
      root.removeEventListener("scroll", schedule)
      if (scrollFrame !== undefined) cancelAnimationFrame(scrollFrame)
    })
  })
  onCleanup(cancel)
  return {
    state,
    activeIndex,
    preview,
    point,
    select,
    toggle: () => setState("visible", !state.visible),
    start: () => setState("dragging", true),
    finish: () => {
      if (frame !== undefined) cancelAnimationFrame(frame)
      if (pendingID) flush()
      frame = undefined
      setState({ dragging: false, previewID: "" })
    },
    leave: () => {
      if (!state.dragging) setState("previewID", "")
    },
  }
}

export type MessageNavigation = ReturnType<typeof createMessageNavigation>
