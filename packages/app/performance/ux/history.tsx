import { For } from "solid-js"
import { createTimelineSearchController } from "../../src/session/timeline/search-controller"
import { createSessionNavigation } from "../../src/extensions/session-navigation-state"
import {
  SessionNavigationActions,
  SessionSearchPopover,
  SessionHistoryNavigation,
} from "../../src/extensions/session-navigation-view"
import { historyState, setHistoryState, historyData, finishPage, failPage } from "./history-data"
export default function HistoryFixture() {
  let scroller: HTMLDivElement | undefined
  const reveal = (id: string) =>
    scroller?.querySelector<HTMLElement>(`[data-message-id="${id}"]`)?.scrollIntoView({ block: "nearest" })
  const session = {
    identity: { sessionID: () => "one", sessionKey: () => historyState.key },
    ownership: {
      capture: () => {
        const key = historyState.key
        return { current: () => historyState.key === key }
      },
    },
    shared: { data: { session: { message: historyData } } },
    history: { visibleUserMessages: () => historyState.messages, messages: () => historyState.messages },
  }
  const timeline = { scroller: () => scroller, view: { unpin: () => {} }, actions: { revealMessage: reveal } }
  const { navigation, history, messages } = createSessionNavigation(session as never, timeline as never)
  const search = createTimelineSearchController({
    sessionID: session.identity.sessionID,
    sessionKey: session.identity.sessionKey,
    scrollRef: () => scroller,
    revealMessage: reveal,
    pauseAutoScroll: () => {},
  })
  return (
    <section data-slot="session-chat-panel" style={{ position: "relative", margin: "24px", width: "min(700px, 90vw)" }}>
      <SessionNavigationActions search={search} navigation={navigation} />
      <SessionSearchPopover search={search} history={history} />
      <div ref={scroller} style={{ height: "300px", overflow: "auto" }}>
        <For each={messages()}>
          {(message) => (
            <div data-message-id={message.id} data-timeline-part-id={`${message.id}:text:0`} style={{ height: "64px" }}>
              <p data-slot="user-message-text">{message.text}</p>
            </div>
          )}
        </For>
      </div>
      <SessionHistoryNavigation navigation={navigation} messages={messages()} />
      <p id="history-pages">{historyState.pages}</p>
      <button id="history-slow" onClick={() => setHistoryState("slow", true)}>
        Delay pages
      </button>
      <button id="history-fast" onClick={() => setHistoryState("slow", false)}>
        Use immediate pages
      </button>
      <button id="history-resolve" onClick={finishPage}>
        Complete page
      </button>
      <button id="history-reject" onClick={failPage}>
        Fail page
      </button>
      <button id="history-switch" onClick={() => setHistoryState({ key: "remote:one", loading: false })}>
        Switch instance
      </button>
    </section>
  )
}
