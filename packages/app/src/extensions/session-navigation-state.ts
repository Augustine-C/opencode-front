import { createEffect, createMemo, on } from "solid-js"
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
  const [state, setState] = createStore({ error: false })
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
    load: async () => {
      const id = session.identity.sessionID()
      if (!id || history.loading || !history.more) return
      const owner = session.ownership.capture()
      setState("error", false)
      try {
        await session.shared.data.session.message.loadMore(id)
      } catch {
        if (owner.current()) setState("error", true)
      }
    },
  }
  createEffect(on(session.identity.sessionKey, () => setState("error", false)))
  return {
    messages,
    navigation,
    history,
    previewResponse,
  }
}
