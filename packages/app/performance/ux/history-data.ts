import { createStore } from "solid-js/store"
export const [historyState, setHistoryState] = createStore({
  key: "local:one",
  loading: false,
  slow: false,
  pages: 0,
  messages: Array.from({ length: 20 }, (_, i) => ({
    id: `m${80 + i}`,
    type: "user",
    text: (80 + i) % 5 === 0 ? `Message ${80 + i} needle` : `Message ${80 + i}`,
  })),
})
let resolve: (() => void) | undefined
let reject: ((error: Error) => void) | undefined
export const historyData = {
  list: () => historyState.messages,
  more: () => Number(historyState.messages[0]?.id.slice(1)) > 0,
  loading: () => historyState.loading,
  async loadMore() {
    const key = historyState.key
    const first = Number(historyState.messages[0].id.slice(1))
    setHistoryState({ loading: true, pages: historyState.pages + 1 })
    try {
      if (historyState.slow)
        await new Promise<void>((done, fail) => {
          resolve = done
          reject = fail
        })
      if (key !== historyState.key) return
      const earlier = Array.from({ length: Math.min(10, first) }, (_, i) => ({
        id: `m${first - 10 + i}`,
        type: "user",
        text: (first - 10 + i) % 5 === 0 ? `Message ${first - 10 + i} needle` : `Message ${first - 10 + i}`,
      }))
      setHistoryState("messages", [...earlier, ...historyState.messages])
    } finally {
      if (key === historyState.key) setHistoryState("loading", false)
    }
  },
}
export const finishPage = () => resolve?.()
export const failPage = () => reject?.(new Error("synthetic load error"))
export const useData = () => ({ session: { message: historyData } })
export const useCommand = () => ({ register: () => {} })
