import { createEffect, createMemo, on } from "solid-js"
import { createStore } from "solid-js/store"
import { createResizeObserver } from "@solid-primitives/resize-observer"
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
  const [state, setState] = createStore({
    error: false,
    toolbar: undefined as HTMLDivElement | undefined,
    toolbarHeight: 0,
  })
  createResizeObserver(
    () => state.toolbar,
    () => setState("toolbarHeight", state.toolbar?.getBoundingClientRect().height ?? 0),
  )
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
    toolbar: {
      height: () => state.toolbarHeight,
      setRef: (element: HTMLDivElement | undefined) => {
        setState("toolbar", element)
        setState("toolbarHeight", element?.getBoundingClientRect().height ?? 0)
      },
    },
  }
}
