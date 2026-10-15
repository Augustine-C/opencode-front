import { createEffect, createMemo, on, onCleanup } from "solid-js"
import { createStore } from "solid-js/store"
import { readPromptPresentation } from "@/composer/comment-note"
import type { SessionModel } from "@/session/model"
import type { SessionTimelineInteraction } from "@/session/timeline/interaction"
import { createMessageNavigation } from "./session-navigation"

export function createSessionNavigation(session: SessionModel, timeline: SessionTimelineInteraction) {
  const messages = createMemo(() =>
    session.history.visibleUserMessages().map((message) => ({
      id: message.id,
      text: readPromptPresentation(message.metadata)?.displayText ?? message.text,
    })),
  )
  const navigation = createMessageNavigation({
    sessionKey: session.identity.sessionKey,
    messages,
    scroller: timeline.scroller,
    unpin: timeline.view.unpin,
    reveal: timeline.actions.revealMessage,
  })
  const previewResponse = createMemo(() => {
    const id = navigation.preview()?.id
    if (!id) return ""
    const items = session.history.messages()
    const start = items.findIndex((message) => message.id === id)
    if (start === -1) return ""
    let response = ""
    for (let index = start + 1; index < items.length; index++) {
      const message = items[index]
      if (message.type === "user" || message.type === "shell") break
      if (message.type !== "assistant") continue
      const text = message.content
        .flatMap((part) => (part.type === "text" ? [part.text] : []))
        .join(" ")
        .trim()
      if (text) response = text
    }
    return response.slice(0, 600)
  })
  const [state, setState] = createStore({ error: false, continuing: false })
  let continuation = 0
  const cancel = () => {
    continuation++
    setState("continuing", false)
  }
  onCleanup(cancel)
  const history = {
    get more() {
      const id = session.identity.sessionID()
      return !!id && session.shared.data.session.message.more(id)
    },
    get loading() {
      const id = session.identity.sessionID()
      return !!id && session.shared.data.session.message.loading(id)
    },
    get error() {
      return state.error
    },
    get continuing() {
      return state.continuing
    },
    cancel,
    searchMore: async (matches: () => number) => {
      if (state.continuing || history.loading || !history.more) return
      const owner = session.ownership.capture()
      const token = ++continuation
      const before = matches()
      setState("continuing", true)
      try {
        // A new explicit action is required after five pages, even when no matches were found.
        for (let page = 0; page < 5 && token === continuation && owner.current() && history.more; page++) {
          if (!(await history.load())) break
          if (matches() > before) break
        }
      } finally {
        if (token === continuation && owner.current()) setState("continuing", false)
      }
    },
    load: async () => {
      const id = session.identity.sessionID()
      if (!id || history.loading || !history.more) return
      const owner = session.ownership.capture()
      setState("error", false)
      timeline.view.unpin()
      try {
        await session.shared.data.session.message.loadMore(id)
        return owner.current()
      } catch {
        if (owner.current()) setState("error", true)
        return false
      }
    },
  }
  createEffect(
    on(session.identity.sessionKey, () => {
      cancel()
      setState("error", false)
    }),
  )
  return {
    messages,
    navigation,
    history,
    previewResponse,
  }
}
